import time
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Set, Optional
from loguru import logger
import pulp

from models.schemas import (
    Employee, Shift, Assignment, OptimizationMetrics, ConstraintType
)
from models.api_models import (
    ShiftScheduleRequest, ShiftScheduleResponse
)
from services.constraint_manager import ConstraintManager

class ShiftScheduler:
    """Main scheduling service using Integer Linear Programming."""
    
    def __init__(self):
        """Initialize the shift scheduler."""
        pass
    
    def schedule(self, request: ShiftScheduleRequest) -> ShiftScheduleResponse:
        """
        Schedule employees to shifts using ILP optimization.
        
        Args:
            request: ShiftScheduleRequest containing employees, shifts, and constraints
        
        Returns:
            ShiftScheduleResponse with assignments and optimization details
        """
        start_time = datetime.now()
        
        # Extract data from request
        employees = request.employees
        shifts = request.shifts
        constraints = request.constraints
        current_assignments = request.current_assignments
        
        try:
            # Validate input data
            self._validate_input_data(employees, shifts)
            
            # Initialize constraint manager with current data
            constraint_manager = ConstraintManager(employees, shifts)
            
            # Create the optimization problem
            problem = self._create_problem()
            
            # Create decision variables
            variables = self._create_variables(problem, employees, shifts)
            
            # Apply constraints
            self._apply_constraints(problem, variables, constraints, constraint_manager, employees, shifts)
            
            # Set objective function
            self._set_objective(problem, variables, employees, shifts)
            
            # Configure solver
            solver = self._configure_solver()
            
            # Solve the problem
            logger.info("Starting optimization...")
            status = problem.solve(solver)
            
            # Process results
            result = self._process_results(problem, variables, status, start_time, employees, shifts, constraints)
            
            return result
            
        except Exception as e:
            logger.error(f"Error during scheduling: {str(e)}")
            execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return ShiftScheduleResponse(
                success=False,
                assignments=[],
                unassigned_shifts=[shift.id for shift in shifts],
                metrics=OptimizationMetrics(
                    total_overtime_minutes=0,
                    constraint_violations=0,
                    optimization_time_ms=execution_time_ms,
                    objective_value=0.0
                ),
                constraints_applied=[],
                message=f"Error: {str(e)}"
            )
    
    def _validate_input_data(self, employees: List[Employee], shifts: List[Shift]) -> None:
        """Validate input data for scheduling."""
        if not employees:
            raise ValueError("No employees provided")
        
        if not shifts:
            raise ValueError("No shifts provided")
        
        # Check for unique IDs
        emp_ids = [emp.id for emp in employees]
        if len(emp_ids) != len(set(emp_ids)):
            raise ValueError("Duplicate employee IDs found")
        
        shift_ids = [shift.id for shift in shifts]
        if len(shift_ids) != len(set(shift_ids)):
            raise ValueError("Duplicate shift IDs found")
    
    def _create_problem(self) -> pulp.LpProblem:
        """Create the linear programming problem."""
        sense = pulp.LpMaximize # We need to maximize number of shifts assigned (allows unassigned shifts)
        return pulp.LpProblem("Employee_Shift_Scheduling", sense)
    
    def _create_variables(self, problem: pulp.LpProblem, employees: List[Employee], shifts: List[Shift]) -> Dict:
        """Create binary decision variables for employee-shift assignments."""
        variables = {}
        
        for employee in employees:
            variables[employee.id] = {}
            for shift in shifts:
                var_name = f"assign_{employee.id}_{shift.id}"
                variables[employee.id][shift.id] = pulp.LpVariable(
                    var_name, cat='Binary'
                )
        
        logger.info(f"Created {len(employees) * len(shifts)} decision variables")
        return variables
    
    def _apply_constraints(self, 
                          problem: pulp.LpProblem, 
                          variables: Dict, 
                          constraints: List[ConstraintType],
                          constraint_manager: ConstraintManager,
                          employees: List[Employee],
                          shifts: List[Shift]) -> None:
        """Apply specified constraints to the problem."""
        # Ensure each shift is assigned to at most one employee (allows unassigned shifts)
        for shift in shifts:
            problem += pulp.lpSum([
                variables[emp.id][shift.id] for emp in employees
            ]) <= 1
        
        # Apply user-specified constraints
        constraint_methods = {
            ConstraintType.SKILL_MATCHING: constraint_manager.apply_skill_matching,
            ConstraintType.OVERTIME_LIMITS: constraint_manager.apply_overtime_limits,
            ConstraintType.AVAILABILITY_WINDOWS: constraint_manager.apply_availability_windows,
            ConstraintType.NO_OVERLAPPING: constraint_manager.apply_no_overlapping
        }
        
        for constraint_type in constraints:
            if constraint_type in constraint_methods:
                constraint_methods[constraint_type](problem, variables)
                logger.info(f"Applied constraint: {constraint_type}")
    
    def _set_objective(self, 
                      problem: pulp.LpProblem, 
                      variables: Dict,
                      employees: List[Employee],
                      shifts: List[Shift]) -> None:
        """Set the objective function for optimization."""
        # Maximize number of assigned shifts (allows some shifts to remain unassigned if constraints prevent assignment)
        total_assignments = pulp.lpSum([
            variables[emp.id][shift.id]
            for emp in employees
            for shift in shifts
        ])
        problem += total_assignments
    
    def _configure_solver(self) -> pulp.LpSolver:
        """Configure the ILP solver."""
        solver = pulp.PULP_CBC_CMD(msg=0)  # Silent mode

        return solver
    
    def _process_results(self, 
                        problem: pulp.LpProblem, 
                        variables: Dict, 
                        status: int, 
                        start_time: datetime,
                        employees: List[Employee],
                        shifts: List[Shift],
                        constraints: List[ConstraintType]) -> ShiftScheduleResponse:
        """Process optimization results and create response."""
        execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Calculate metrics
        total_overtime_minutes = self._calculate_overtime_minutes(variables, employees, shifts)
        constraint_violations = 0  # TODO: Implement constraint violation counting
        
        if status == pulp.LpStatusOptimal:
            assignments = []
            assigned_shifts = set()
            
            for emp in employees:
                for shift in shifts:
                    if variables[emp.id][shift.id].varValue == 1:
                        assignments.append(Assignment(
                            shift_id=shift.id,
                            employee_id=emp.id
                        ))
                        assigned_shifts.add(shift.id)
            
            unassigned_shifts = [
                shift.id for shift in shifts 
                if shift.id not in assigned_shifts
            ]
            
            metrics = OptimizationMetrics(
                total_overtime_minutes=total_overtime_minutes,
                constraint_violations=constraint_violations,
                optimization_time_ms=execution_time_ms,
                objective_value=float(problem.objective.value()) if problem.objective.value() else 0.0
            )
            
            return ShiftScheduleResponse(
                success=True,
                assignments=assignments,
                unassigned_shifts=unassigned_shifts,
                metrics=metrics,
                constraints_applied=[constraint.value for constraint in constraints],
                message="Optimization completed successfully"
            )
        
        else:
            metrics = OptimizationMetrics(
                total_overtime_minutes=0,
                constraint_violations=0,
                optimization_time_ms=execution_time_ms,
                objective_value=0.0
            )
            
            return ShiftScheduleResponse(
                success=False,
                assignments=[],
                unassigned_shifts=[shift.id for shift in shifts],
                metrics=metrics,
                constraints_applied=[constraint.value for constraint in constraints],
                message=f"Optimization failed with status: {pulp.LpStatus[status]}"
            )
    
    def _calculate_overtime_minutes(self, 
                                   variables: Dict, 
                                   employees: List[Employee], 
                                   shifts: List[Shift]) -> int:
        """Calculate total overtime minutes for all employees."""
        total_overtime = 0
        
        for emp in employees:
            total_hours = 0
            for shift in shifts:
                if variables[emp.id][shift.id].varValue == 1:
                    total_hours += shift.duration_hours
            
            # Calculate overtime (hours over max_hours)
            if total_hours > emp.max_hours:
                overtime_hours = total_hours - emp.max_hours
                total_overtime += int(overtime_hours * 60)  # Convert to minutes
        
        return total_overtime