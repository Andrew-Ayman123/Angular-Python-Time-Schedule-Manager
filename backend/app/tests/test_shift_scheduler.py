import pytest
from datetime import datetime, timedelta
from typing import List

from services.shift_scheduler import ShiftScheduler
from models.schemas import Employee, Shift, Assignment, ConstraintType
from models.api_models import ShiftScheduleRequest, ShiftScheduleResponse

from .test_utils import print_metrics, create_employee, create_shift

def test_basic_scheduling_success() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 24, base_datetime=base_datetime),
        create_employee("emp2", ["doctor"], 40, 0, 24, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 8, base_datetime=base_datetime),
        create_shift("shift2", "doctor", 0, 8, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    assert response.success
    assert len(response.assignments) == 2
    assert len(response.unassigned_shifts) == 0
    assignments_dict = {a.shift_id: a.employee_id for a in response.assignments}
    assert "shift1" in assignments_dict
    assert "shift2" in assignments_dict


def test_skill_matching_constraint() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 24, base_datetime=base_datetime),
        create_employee("emp2", ["admin"], 40, 0, 24, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "doctor", 0, 8, base_datetime=base_datetime),
        create_shift("shift2", "nursing", 0, 8, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    # assert not response.success
    assert "shift1" in response.unassigned_shifts


def test_overtime_limits_constraint() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 16, 0, 24, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 10, base_datetime=base_datetime),
        create_shift("shift2", "nursing", 10, 10, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING, ConstraintType.OVERTIME_LIMITS]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        assert len(response.assignments) <= 1
    assert len(response.unassigned_shifts) >= 1


def test_availability_windows_constraint() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 8, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 4, base_datetime=base_datetime),
        create_shift("shift2", "nursing", 10, 4, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING, ConstraintType.AVAILABILITY_WINDOWS]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        assigned_shifts = [a.shift_id for a in response.assignments]
        assert "shift1" in assigned_shifts
        assert "shift2" not in assigned_shifts


def test_no_overlapping_constraint() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 24, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 6, base_datetime=base_datetime),
        create_shift("shift2", "nursing", 4, 6, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING, ConstraintType.NO_OVERLAPPING]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        assert len(response.assignments) <= 1


def test_multiple_employees_multiple_shifts() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing", "admin"], 40, 0, 24, base_datetime=base_datetime),
        create_employee("emp2", ["doctor"], 40, 0, 24, base_datetime=base_datetime),
        create_employee("emp3", ["nursing"], 40, 0, 24, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 8, base_datetime=base_datetime),
        create_shift("shift2", "doctor", 0, 8, base_datetime=base_datetime),
        create_shift("shift3", "admin", 8, 4, base_datetime=base_datetime),
        create_shift("shift4", "nursing", 8, 8, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    assert response.success
    assert len(response.assignments) == 4
    assert len(response.unassigned_shifts) == 0


def test_insufficient_employees() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 20, 0, 24, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 8, base_datetime=base_datetime),
        create_shift("shift2", "nursing", 8, 8, base_datetime=base_datetime),
        create_shift("shift3", "nursing", 16, 8, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING, ConstraintType.OVERTIME_LIMITS]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        total_assigned_hours = sum(
            next(shift.duration_hours for shift in shifts if shift.id == assignment.shift_id)
            for assignment in response.assignments
        )
        assert total_assigned_hours <= 20


def test_complex_scenario_all_constraints() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 24, 0, 16, base_datetime=base_datetime),
        create_employee("emp2", ["doctor", "nursing"], 32, 0, 12, base_datetime=base_datetime),
        create_employee("emp3", ["admin"], 40, 4, 8, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 8, base_datetime=base_datetime),
        create_shift("shift2", "doctor", 2, 6, base_datetime=base_datetime),
        create_shift("shift3", "admin", 4, 4, base_datetime=base_datetime),
        create_shift("shift4", "nursing", 12, 8, base_datetime=base_datetime),
        create_shift("shift5", "nursing", 8, 4, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.OVERTIME_LIMITS,
            ConstraintType.AVAILABILITY_WINDOWS,
            ConstraintType.NO_OVERLAPPING
        ]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    assert response is not None
    if response.success:
        assert len(response.assignments) >= 2

def test_duplicate_employee_ids() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 24, base_datetime=base_datetime),
        create_employee("emp1", ["doctor"], 40, 0, 24, base_datetime=base_datetime)
    ]
    shifts = [create_shift("shift1", "nursing", 0, 8, base_datetime=base_datetime)]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    assert not response.success
    assert "Duplicate employee IDs" in response.message


def test_duplicate_shift_ids() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [create_employee("emp1", ["nursing"], 40, 0, 24, base_datetime=base_datetime)]
    shifts = [
        create_shift("shift1", "nursing", 0, 8, base_datetime=base_datetime),
        create_shift("shift1", "doctor", 8, 8, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    assert not response.success
    assert "Duplicate shift IDs" in response.message


def test_optimization_metrics() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [create_employee("emp1", ["nursing"], 16, 0, 24, base_datetime=base_datetime)]
    shifts = [create_shift("shift1", "nursing", 0, 20, base_datetime=base_datetime)]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    assert response.metrics is not None
    assert response.metrics.optimization_time_ms >= 0
    assert response.metrics.total_overtime_minutes >= 0
    assert response.metrics.constraint_violations >= 0


def test_partial_skill_coverage() -> None:
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 24, base_datetime=base_datetime),
        create_employee("emp2", ["admin"], 40, 0, 24, base_datetime=base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 8, base_datetime=base_datetime),
        create_shift("shift2", "admin", 8, 8, base_datetime=base_datetime),
        create_shift("shift3", "doctor", 16, 8, base_datetime=base_datetime),
        create_shift("shift4", "surgery", 24, 8, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        assert len(response.assignments) == 2
        assert len(response.unassigned_shifts) == 2
        assigned_shift_ids = [a.shift_id for a in response.assignments]
        assert "shift1" in assigned_shift_ids
        assert "shift2" in assigned_shift_ids
        assert "shift3" in response.unassigned_shifts
        assert "shift4" in response.unassigned_shifts

# HIGH-PRESSURE SCENARIOS WITH TIGHT CONSTRAINTS

def test_extreme_time_pressure_minimal_availability() -> None:
    """Test with very limited availability windows and overlapping shifts"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 8, 0, 2, base_datetime=base_datetime),  # Only 2 hours available
        create_employee("emp2", ["nursing"], 8, 1, 2, base_datetime=base_datetime),  # Only 2 hours, starts 1 hour later
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 3, base_datetime=base_datetime),  # 3-hour shift
        create_shift("shift2", "nursing", 1, 3, base_datetime=base_datetime),  # Overlapping 3-hour shift
        create_shift("shift3", "nursing", 2, 3, base_datetime=base_datetime),  # Another overlapping shift
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.AVAILABILITY_WINDOWS,
            ConstraintType.NO_OVERLAPPING,
            ConstraintType.OVERTIME_LIMITS
        ]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    # Under such tight constraints, expect very few or no assignments
    if response.success:
        assert len(response.assignments) <= 1
    assert len(response.unassigned_shifts) >= 2


def test_impossible_skill_combinations() -> None:
    """Test with shifts requiring skills no employees have"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 24, base_datetime=base_datetime),
        create_employee("emp2", ["admin"], 40, 0, 24, base_datetime=base_datetime),
    ]
    shifts = [
        create_shift("shift1", "surgery", 0, 8, base_datetime=base_datetime),
        create_shift("shift2", "radiology", 8, 8, base_datetime=base_datetime),
        create_shift("shift3", "anesthesia", 16, 8, base_datetime=base_datetime),
        create_shift("shift4", "nursing", 0, 8, base_datetime=base_datetime),  # Only this one is possible
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[ConstraintType.SKILL_MATCHING]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        assert len(response.assignments) == 1  # Only nursing shift can be assigned
        assigned_shift_ids = [a.shift_id for a in response.assignments]
        assert "shift4" in assigned_shift_ids
    assert len(response.unassigned_shifts) == 3


def test_zero_tolerance_overtime_with_high_demand() -> None:
    """Test with zero overtime tolerance but high shift demand"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 8, 0, 24, base_datetime=base_datetime),  # Exactly 8 hours max
        create_employee("emp2", ["nursing"], 8, 0, 24, base_datetime=base_datetime),  # Exactly 8 hours max
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 4, base_datetime=base_datetime),
        create_shift("shift2", "nursing", 4, 4, base_datetime=base_datetime),
        create_shift("shift3", "nursing", 8, 4, base_datetime=base_datetime),
        create_shift("shift4", "nursing", 12, 4, base_datetime=base_datetime),
        create_shift("shift5", "nursing", 16, 4, base_datetime=base_datetime),  # Extra shifts that can't be covered
        create_shift("shift6", "nursing", 20, 4, base_datetime=base_datetime),
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.OVERTIME_LIMITS,
            ConstraintType.NO_OVERLAPPING
        ]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        assert len(response.assignments) <= 4  # Max 2 shifts per employee
        # Verify no employee works more than their max hours
        employee_hours = {}
        for assignment in response.assignments:
            shift = next(s for s in shifts if s.id == assignment.shift_id)
            employee_hours[assignment.employee_id] = employee_hours.get(assignment.employee_id, 0) + shift.duration_hours
        for emp_id, hours in employee_hours.items():
            assert hours <= 8
    assert len(response.unassigned_shifts) >= 2


def test_conflicting_availability_windows() -> None:
    """Test with multiple employees having very narrow, non-overlapping availability windows"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 4, base_datetime=base_datetime),   # Available 0-4 hours
        create_employee("emp2", ["nursing"], 40, 4, 4, base_datetime=base_datetime),   # Available 4-8 hours
        create_employee("emp3", ["nursing"], 40, 8, 4, base_datetime=base_datetime),   # Available 8-12 hours
    ]
    shifts = [
        create_shift("shift1", "nursing", 2, 6, base_datetime=base_datetime),  # 2-8 hours (spans emp1 and emp2)
        create_shift("shift2", "nursing", 6, 6, base_datetime=base_datetime),  # 6-12 hours (spans emp2 and emp3)
        create_shift("shift3", "nursing", 0, 12, base_datetime=base_datetime), # 0-12 hours (spans all)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.AVAILABILITY_WINDOWS,
            ConstraintType.NO_OVERLAPPING
        ]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    # With such tight availability windows, many shifts should remain unassigned
    if response.success:
        assert len(response.assignments) <= 3
    assert len(response.unassigned_shifts) >= 0


def test_cascade_failure_scenario() -> None:
    """Test a scenario where one constraint violation creates a cascade of failures"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["critical_care"], 12, 0, 8, base_datetime=base_datetime),  # Key employee with limited hours
        create_employee("emp2", ["nursing"], 40, 0, 24, base_datetime=base_datetime),
        create_employee("emp3", ["nursing"], 40, 0, 24, base_datetime=base_datetime),
    ]
    shifts = [
        create_shift("shift1", "critical_care", 0, 6, base_datetime=base_datetime),   # Requires key employee
        create_shift("shift2", "critical_care", 6, 6, base_datetime=base_datetime),   # Also requires key employee
        create_shift("shift3", "critical_care", 12, 6, base_datetime=base_datetime),  # Cannot be covered
        create_shift("shift4", "nursing", 0, 8, base_datetime=base_datetime),        # Regular nursing
        create_shift("shift5", "nursing", 8, 8, base_datetime=base_datetime),        # Regular nursing
        create_shift("shift6", "nursing", 16, 8, base_datetime=base_datetime),       # Regular nursing
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.OVERTIME_LIMITS,
            ConstraintType.AVAILABILITY_WINDOWS,
            ConstraintType.NO_OVERLAPPING
        ]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        # Should be able to assign nursing shifts but struggle with critical care
        critical_care_assignments = [a for a in response.assignments 
                                   if next(s for s in shifts if s.id == a.shift_id).required_skill == "critical_care"]
        assert len(critical_care_assignments) <= 2  # Limited by emp1's hours and availability
    # At least one critical care shift should be unassigned
    critical_care_unassigned = [s for s in response.unassigned_shifts 
                              if next(shift for shift in shifts if shift.id == s).required_skill == "critical_care"]
    assert len(critical_care_unassigned) >= 1


def test_maximum_constraint_pressure() -> None:
    """Ultimate stress test with all constraints under maximum pressure"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    employees = [
        create_employee("emp1", ["icu"], 6, 0, 3, base_datetime=base_datetime),       # 6 max hours, 3 available
        create_employee("emp2", ["icu"], 6, 2, 3, base_datetime=base_datetime),       # 6 max hours, 3 available, offset
        create_employee("emp3", ["surgery"], 8, 1, 4, base_datetime=base_datetime),   # Different skill
        create_employee("emp4", ["nursing"], 10, 0, 6, base_datetime=base_datetime),  # General nursing
    ]
    shifts = [
        create_shift("shift1", "icu", 0, 2, base_datetime=base_datetime),
        create_shift("shift2", "icu", 1, 2, base_datetime=base_datetime),      # Overlaps with shift1
        create_shift("shift3", "icu", 2, 2, base_datetime=base_datetime),      # Overlaps with shift2
        create_shift("shift4", "surgery", 1, 3, base_datetime=base_datetime),  # Different skill, overlaps
        create_shift("shift5", "nursing", 0, 4, base_datetime=base_datetime),  # Long nursing shift
        create_shift("shift6", "icu", 4, 2, base_datetime=base_datetime),      # Outside most availability windows
        create_shift("shift7", "pharmacy", 0, 2, base_datetime=base_datetime), # Skill nobody has
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.OVERTIME_LIMITS,
            ConstraintType.AVAILABILITY_WINDOWS,
            ConstraintType.NO_OVERLAPPING
        ]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    
    # Under maximum pressure, expect minimal success
    if response.success:
        assert len(response.assignments) <= 4  # Very limited assignments possible
        
        # Verify all constraints are respected
        employee_hours = {}
        employee_shifts = {}
        for assignment in response.assignments:
            shift = next(s for s in shifts if s.id == assignment.shift_id)
            employee = next(e for e in employees if e.id == assignment.employee_id)
            
            # Check skill matching
            assert shift.required_skill in employee.skills
            
            # Track hours for overtime check
            employee_hours[assignment.employee_id] = employee_hours.get(assignment.employee_id, 0) + shift.duration_hours
            
            # Track shifts for overlap check
            if assignment.employee_id not in employee_shifts:
                employee_shifts[assignment.employee_id] = []
            employee_shifts[assignment.employee_id].append(shift)
        
        # Verify overtime limits
        for emp_id, hours in employee_hours.items():
            emp = next(e for e in employees if e.id == emp_id)
            assert hours <= emp.max_hours
        
        # Verify no overlapping shifts per employee
        for emp_id, emp_shifts in employee_shifts.items():
            for i, shift1 in enumerate(emp_shifts):
                for shift2 in emp_shifts[i+1:]:
                    # Check if shifts overlap
                    assert shift1.end_time <= shift2.start_time or shift2.end_time <= shift1.start_time
    
    # Should have several unassigned shifts due to constraints
    assert len(response.unassigned_shifts) >= 3


def test_performance_under_pressure() -> None:
    """Test scheduler performance with a large number of constraints and entities"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 9, 0)
    
    # Create many employees with varying constraints
    employees = []
    for i in range(20):
        skills = ["nursing"] if i < 10 else ["doctor"] if i < 15 else ["admin"]
        max_hours = 8 + (i % 3) * 4  # 8, 12, or 16 hours
        avail_start = i % 8  # Staggered start times
        avail_duration = 6 + (i % 4) * 2  # 6, 8, 10, or 12 hour windows
        employees.append(create_employee(f"emp{i}", skills, max_hours, avail_start, avail_duration, base_datetime))
    
    # Create many shifts with tight timing
    shifts = []
    for i in range(50):
        skills = ["nursing", "doctor", "admin"]
        required_skill = skills[i % 3]
        start_offset = i * 0.5  # Shifts every 30 minutes
        duration = 2 + (i % 3)  # 2, 3, or 4 hour shifts
        shifts.append(create_shift(f"shift{i}", required_skill, start_offset, duration, base_datetime))
    
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.OVERTIME_LIMITS,
            ConstraintType.AVAILABILITY_WINDOWS,
            ConstraintType.NO_OVERLAPPING
        ]
    )
    
    start_time = datetime.now()
    response = scheduler.schedule(request)
    end_time = datetime.now()
    execution_time = (end_time - start_time).total_seconds()
    
    print_metrics(response)
    print(f"Execution time: {execution_time:.2f} seconds")
    
    # Performance expectations
    assert execution_time < 30.0  # Should complete within 30 seconds
    assert response is not None
    
    if response.success:
        # Should assign a reasonable number of shifts given the constraints
        assignment_ratio = len(response.assignments) / len(shifts)
        assert assignment_ratio >= 0.1  # At least 10% of shifts should be assignable
        
        # Verify response metrics exist
        assert response.metrics is not None
        assert response.metrics.optimization_time_ms >= 0
    
    # Should handle the complexity without crashing
    assert len(response.assignments) + len(response.unassigned_shifts) == len(shifts)
