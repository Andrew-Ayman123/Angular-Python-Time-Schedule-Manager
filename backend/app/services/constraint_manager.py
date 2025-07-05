from typing import List, Dict, Set
from loguru import logger
import pulp

from models.schemas import Employee, Shift, ConstraintType


class ConstraintManager:
    """Manages constraint application for the scheduling problem."""
    
    def __init__(self, employees: List[Employee], shifts: List[Shift]):
        self.employees = {emp.id: emp for emp in employees}
        self.shifts = {shift.id: shift for shift in shifts}
    
    def apply_skill_matching(self, problem: pulp.LpProblem, variables: Dict) -> None:
        """Apply skill matching constraints."""
        for shift_id, shift in self.shifts.items():
            for emp_id, employee in self.employees.items():
                if shift.required_skill not in employee.skills:
                    # Employee cannot work this shift due to skill mismatch
                    problem += variables[emp_id][shift_id] == 0
        
        logger.info("Applied skill matching constraints")
    
    def apply_overtime_limits(self, problem: pulp.LpProblem, variables: Dict) -> None:
        """Apply overtime/maximum hours constraints."""
        for emp_id, employee in self.employees.items():
            total_hours = pulp.lpSum([
                variables[emp_id][shift_id] * self.shifts[shift_id].duration_hours
                for shift_id in self.shifts.keys()
            ])
            problem += total_hours <= employee.max_hours
        
        logger.info("Applied overtime limits constraints")
    
    def apply_availability_windows(self, problem: pulp.LpProblem, variables: Dict) -> None:
        """Apply availability window constraints."""
        for emp_id, employee in self.employees.items():
            for shift_id, shift in self.shifts.items():
                # Check if shift is within employee's availability window
                if not self._is_shift_within_availability(shift, employee):
                    problem += variables[emp_id][shift_id] == 0
        
        logger.info("Applied availability window constraints")
    
    def apply_no_overlapping(self, problem: pulp.LpProblem, variables: Dict) -> None:
        """Apply non-overlapping shifts constraint."""
        for emp_id in self.employees.keys():
            overlapping_groups = self._find_overlapping_shifts()
            
            for group in overlapping_groups:
                # For each group of overlapping shifts, employee can work at most one
                problem += pulp.lpSum([
                    variables[emp_id][shift_id] for shift_id in group
                ]) <= 1
        
        logger.info("Applied non-overlapping shifts constraints")
    
    def _is_shift_within_availability(self, shift: Shift, employee: Employee) -> bool:
        """Check if a shift falls within an employee's availability window."""
        return (employee.availability_start <= shift.start_time and 
                shift.end_time <= employee.availability_end)
    
    def _find_overlapping_shifts(self) -> List[Set[str]]:
        """Find groups of overlapping shifts."""
        overlapping_groups = []
        processed = set()
        
        for shift1_id, shift1 in self.shifts.items():
            if shift1_id in processed:
                continue
            
            overlap_group = {shift1_id}
            
            for shift2_id, shift2 in self.shifts.items():
                if shift1_id != shift2_id and self._shifts_overlap(shift1, shift2):
                    overlap_group.add(shift2_id)
            
            if len(overlap_group) > 1:
                overlapping_groups.append(overlap_group)
                processed.update(overlap_group)
        
        return overlapping_groups
    
    def _shifts_overlap(self, shift1: Shift, shift2: Shift) -> bool:
        """Check if two shifts overlap in time."""
        return (shift1.start_time < shift2.end_time and 
                shift2.start_time < shift1.end_time)
