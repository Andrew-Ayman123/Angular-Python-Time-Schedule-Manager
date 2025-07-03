"""
Schedule optimization service using Integer Linear Programming (ILP).

This module implements the core optimization logic for employee scheduling
using PuLP library for mathematical optimization.
"""

import time
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Set
from loguru import logger
import pulp

from models.schemas import (
    Employee, Shift, Assignment, OptimizationMetrics, ConstraintType
)
from models.api_models import (
    ScheduleOptimizationRequest, ScheduleOptimizationResponse
)


class ScheduleOptimizer:
    """
    Main class for schedule optimization using Integer Linear Programming.
    
    This class encapsulates all the logic for creating and solving the ILP model
    for employee scheduling with various constraints.
    """

    def __init__(self):
        """Initialize the optimizer with default settings."""
        self.problem = None
        self.variables = {}
        self.employees:list[Employee] = []
        self.shifts:list[Shift] = []
        self.constraints_applied = []

    def optimize_schedule(self, request: ScheduleOptimizationRequest) -> ScheduleOptimizationResponse:
        """
        Main method to optimize the schedule based on the request.
        
        Args:
            request: The optimization request containing employees, shifts, and constraints
            
        Returns:
            ScheduleOptimizationResponse with optimized assignments and metrics
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting optimization for {len(request.employees)} employees and {len(request.shifts)} shifts")
            
            # Initialize the optimization problem
            self._initialize_problem(request)
            
            # Create decision variables
            self._create_variables()
            
            # Set objective function
            self._set_objective()
            
            # Add constraints
            self._add_constraints(request.constraints)
            
            # Solve the problem
            status = self._solve_problem()
            
            # Extract results
            optimization_time = int((time.time() - start_time) * 1000)
            
            if status == pulp.LpStatusOptimal:
                return self._create_success_response(optimization_time)
            else:
                return self._create_failure_response(optimization_time, status)
                
        except Exception as e:
            logger.error(f"Optimization failed: {str(e)}")
            optimization_time = int((time.time() - start_time) * 1000)
            return ScheduleOptimizationResponse(
                success=False,
                assignments=[],
                unassigned_shifts=[shift.id for shift in self.shifts],
                metrics=OptimizationMetrics(
                    total_overtime_minutes=0,
                    constraint_violations=0,
                    optimization_time_ms=optimization_time,
                    objective_value=0.0
                ),
                constraints_applied=self.constraints_applied,
                message=f"Optimization error: {str(e)}"
            )

    def _initialize_problem(self, request: ScheduleOptimizationRequest) -> None:
        """Initialize the ILP problem with employees and shifts."""
        self.employees = request.employees
        self.shifts = request.shifts
        self.constraints_applied = []
        
        # Create the LP problem
        self.problem = pulp.LpProblem("ScheduleOptimization", pulp.LpMaximize)
        
        logger.info(f"Initialized problem with {len(self.employees)} employees and {len(self.shifts)} shifts")

    def _create_variables(self) -> None:
        """Create binary decision variables for employee-shift assignments."""
        self.variables = {}
        
        for employee in self.employees:
            for shift in self.shifts:
                var_name = f"x_{employee.id}_{shift.id}"
                self.variables[(employee.id, shift.id)] = pulp.LpVariable(
                    var_name, cat='Binary'
                )
        
        logger.info(f"Created {len(self.variables)} decision variables")

    def _set_objective(self) -> None:
        """
        Set the objective function to maximize assignment efficiency.
        
        The objective considers:
        - Skill matching bonus
        - Minimizing overtime
        - Balancing workload
        """
        objective_terms = []
        
        for employee in self.employees:
            for shift in self.shifts:
                var = self.variables[(employee.id, shift.id)]
                
                # Base score for any assignment
                score = 10
                
                # Skill matching bonus
                if shift.required_skill in employee.skills:
                    score += 20
                
                # Add penalty for overtime (simplified calculation)
                if shift.duration_hours > 8:
                    score -= 5
                
                objective_terms.append(score * var)
        
        self.problem += pulp.lpSum(objective_terms), "ObjectiveFunction"
        logger.info("Set objective function for maximizing assignment efficiency")

    def _add_constraints(self, constraint_types: List[ConstraintType]) -> None:
        """Add constraints based on the specified constraint types."""
        
        # Each shift assigned to at most one employee
        self._add_shift_assignment_constraints()
        
        # Apply specific constraints based on request
        for constraint_type in constraint_types:
            if constraint_type == ConstraintType.SKILL_MATCHING:
                self._add_skill_matching_constraints()
            elif constraint_type == ConstraintType.OVERTIME_LIMITS:
                self._add_overtime_constraints()
        
        logger.info(f"Added constraints: {self.constraints_applied}")


    def _add_skill_matching_constraints(self) -> None:
        """Ensure employees are only assigned to shifts matching their skills."""
        for employee in self.employees:
            for shift in self.shifts:
                if shift.required_skill not in employee.skills:
                    # Force this variable to 0 if skill doesn't match
                    self.problem += self.variables[(employee.id, shift.id)] == 0, \
                        f"SkillMatch_{employee.id}_{shift.id}"
        
        self.constraints_applied.append("skill_matching")

    def _add_overtime_constraints(self) -> None:
        """Limit overtime hours for each employee."""
        for employee in self.employees:
            total_hours = []
            for shift in self.shifts:
                var = self.variables[(employee.id, shift.id)]
                total_hours.append(var * shift.duration_hours)
            
            # Limit to max_hours
            self.problem += pulp.lpSum(total_hours) <= employee.max_hours, \
                f"MaxHours_{employee.id}"
        
        self.constraints_applied.append("overtime_limits")

   
    

    def _solve_problem(self) -> int:
        """Solve the ILP problem and return the status."""
        logger.info("Solving ILP problem...")
        
        # Use CBC solver (included with PuLP)
        solver = pulp.PULP_CBC_CMD(msg=0)  # msg=0 suppresses solver output
        self.problem.solve(solver)
        
        status = self.problem.status
        logger.info(f"Solver status: {pulp.LpStatus[status]}")
        
        return status

    def _create_success_response(self, optimization_time: int) -> ScheduleOptimizationResponse:
        """Create a successful optimization response."""
        assignments = []
        unassigned_shifts = []
        total_overtime = 0
        
        # Extract assignments from solved variables
        for employee in self.employees:
            employee_hours = 0
            for shift in self.shifts:
                var = self.variables[(employee.id, shift.id)]
                if var.varValue and var.varValue > 0.5:  # Binary variable is 1
                    assignments.append(Assignment(
                        shift_id=shift.id,
                        employee_id=employee.id
                    ))
                    employee_hours += shift.duration_hours
            
            # Calculate overtime
            if employee_hours > employee.max_hours:  # Assuming 40-hour standard week
                total_overtime += int((employee_hours - employee.max_hours) * 60)  # Convert to minutes
        
        # Find unassigned shifts
        assigned_shift_ids = {assignment.shift_id for assignment in assignments}
        unassigned_shifts = [shift.id for shift in self.shifts if shift.id not in assigned_shift_ids]
        
        metrics = OptimizationMetrics(
            total_overtime_minutes=total_overtime,
            constraint_violations=0,  # Assuming optimal solution has no violations
            optimization_time_ms=optimization_time,
            objective_value=self.problem.objective.value() if self.problem.objective else 0.0
        )
        
        logger.info(f"Optimization successful: {len(assignments)} assignments, {len(unassigned_shifts)} unassigned")
        
        return ScheduleOptimizationResponse(
            success=True,
            assignments=assignments,
            unassigned_shifts=unassigned_shifts,
            metrics=metrics,
            constraints_applied=self.constraints_applied,
            message="Optimization completed successfully"
        )

    def _create_failure_response(self, optimization_time: int, status: int) -> ScheduleOptimizationResponse:
        """Create a failure response when optimization doesn't find optimal solution."""
        status_message = {
            pulp.LpStatusInfeasible: "Problem is infeasible - no solution exists with given constraints",
            pulp.LpStatusUnbounded: "Problem is unbounded",
            pulp.LpStatusNotSolved: "Problem not solved",
            pulp.LpStatusUndefined: "Problem status undefined"
        }.get(status, f"Unknown status: {status}")
        
        metrics = OptimizationMetrics(
            total_overtime_minutes=0,
            constraint_violations=0,
            optimization_time_ms=optimization_time,
            objective_value=0.0
        )
        
        logger.warning(f"Optimization failed: {status_message}")
        
        return ScheduleOptimizationResponse(
            success=False,
            assignments=[],
            unassigned_shifts=[shift.id for shift in self.shifts],
            metrics=metrics,
            constraints_applied=self.constraints_applied,
            message=status_message
        )
