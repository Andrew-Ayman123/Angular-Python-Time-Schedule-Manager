import pytest
from datetime import datetime, timedelta
from typing import List

from services.shift_scheduler import ShiftScheduler
from models.schemas import Employee, Shift, Assignment, ConstraintType
from models.api_models import ShiftScheduleRequest, ShiftScheduleResponse
from .test_utils import print_metrics, create_employee, create_shift


def test_skill_matching_plus_overtime_limits():
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("emp1", ["nursing", "admin"], 12, 0, 24, base_datetime),
        create_employee("emp2", ["doctor"], 20, 0, 24, base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 8, base_datetime=base_datetime),
        create_shift("shift2", "admin", 8, 6, base_datetime=base_datetime),
        create_shift("shift3", "doctor", 0, 10, base_datetime=base_datetime),
        create_shift("shift4", "doctor", 12, 12, base_datetime=base_datetime)
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
        alice_hours = sum(
            next(s.duration_hours for s in shifts if s.id == a.shift_id)
            for a in response.assignments if a.employee_id == "emp1"
        )
        bob_hours = sum(
            next(s.duration_hours for s in shifts if s.id == a.shift_id)
            for a in response.assignments if a.employee_id == "emp2"
        )
        assert alice_hours <= 12
        assert bob_hours <= 20


def test_availability_plus_no_overlapping():
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 8, base_datetime),
        create_employee("emp2", ["nursing"], 40, 4, 12, base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 4, base_datetime=base_datetime),
        create_shift("shift2", "nursing", 2, 4, base_datetime=base_datetime),
        create_shift("shift3", "nursing", 6, 4, base_datetime=base_datetime),
        create_shift("shift4", "nursing", 8, 4, base_datetime=base_datetime)
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
    if response.success:
        assigned_shifts = [a.shift_id for a in response.assignments]
        emp_shifts = {}
        for assignment in response.assignments:
            if assignment.employee_id not in emp_shifts:
                emp_shifts[assignment.employee_id] = []
            emp_shifts[assignment.employee_id].append(assignment.shift_id)
        for emp_id, shift_ids in emp_shifts.items():
            shifts_for_emp = [s for s in shifts if s.id in shift_ids]
            for i, shift1 in enumerate(shifts_for_emp):
                for shift2 in shifts_for_emp[i+1:]:
                    assert not (shift1.start_time < shift2.end_time and shift2.start_time < shift1.end_time)


def test_all_constraints_complex_scenario():
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("senior_nurse", ["nursing", "ICU", "admin"], 50, 0, 12, base_datetime),
        create_employee("junior_nurse", ["nursing"], 25, 0, 16, base_datetime),
        create_employee("night_doctor", ["doctor", "emergency"], 60, 12, 12, base_datetime),
        create_employee("admin_worker", ["admin"], 20, 2, 6, base_datetime)
    ]
    shifts = [
        create_shift("day_nurse_1", "nursing", 0, 8, base_datetime=base_datetime),
        create_shift("day_nurse_2", "nursing", 2, 6, base_datetime=base_datetime),
        create_shift("icu_shift", "ICU", 1, 8, base_datetime=base_datetime),
        create_shift("admin_morning", "admin", 2, 4, base_datetime=base_datetime),
        create_shift("evening_nurse", "nursing", 8, 8, base_datetime=base_datetime),
        create_shift("night_doctor", "doctor", 12, 10, base_datetime=base_datetime),
        create_shift("emergency_1", "emergency", 14, 8, base_datetime=base_datetime),
        create_shift("emergency_2", "emergency", 16, 6, base_datetime=base_datetime),
        create_shift("surgery", "surgery", 4, 8, base_datetime=base_datetime),
        create_shift("pharmacy", "pharmacy", 6, 6, base_datetime=base_datetime)
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
    assert response.assignments is not None
    assert response.unassigned_shifts is not None
    assert response.metrics is not None
    if response.success:
        assert len(response.assignments) > 0
        for assignment in response.assignments:
            shift = next(s for s in shifts if s.id == assignment.shift_id)
            employee = next(e for e in employees if e.id == assignment.employee_id)
            assert shift.required_skill in employee.skills
        employee_hours = {}
        for assignment in response.assignments:
            shift = next(s for s in shifts if s.id == assignment.shift_id)
            if assignment.employee_id not in employee_hours:
                employee_hours[assignment.employee_id] = 0
            employee_hours[assignment.employee_id] += shift.duration_hours
        for emp_id, total_hours in employee_hours.items():
            employee = next(e for e in employees if e.id == emp_id)
            assert total_hours <= employee.max_hours
    assert "surgery" in response.unassigned_shifts
    assert "pharmacy" in response.unassigned_shifts


def test_constraint_priority_resolution():
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("emp1", ["nursing"], 8, 0, 24, base_datetime)
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
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.OVERTIME_LIMITS,
            ConstraintType.NO_OVERLAPPING
        ]
    )
    response = scheduler.schedule(request)
    print_metrics(response)
    if response.success:
        total_assigned_hours = sum(
            next(s.duration_hours for s in shifts if s.id == a.shift_id)
            for a in response.assignments
        )
        assert total_assigned_hours <= 8
        assert len(response.assignments) <= 1


def test_partial_constraint_satisfaction():
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("emp1", ["nursing"], 30, 0, 24, base_datetime),
        create_employee("emp2", ["nursing"], 30, 0, 24, base_datetime)
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 12, base_datetime=base_datetime),
        create_shift("shift2", "nursing", 10, 12, base_datetime=base_datetime),
        create_shift("shift3", "nursing", 20, 12, base_datetime=base_datetime)
    ]
    request = ShiftScheduleRequest(
        period="2025-07-07/2025-07-14",
        employees=employees,
        shifts=shifts,
        constraints=[
            ConstraintType.SKILL_MATCHING,
            ConstraintType.OVERTIME_LIMITS,
            ConstraintType.NO_OVERLAPPING,
            ConstraintType.AVAILABILITY_WINDOWS
        ]
    )
    
    response = scheduler.schedule(request)
    print_metrics(response)
    
    assert response is not None
    assert response.success 

    if response.success:
        assert len(response.assignments) > 0
        assert len(response.assignments) == 2  # Only two shifts can be assigned due to overlapping


# HIGH-PRESSURE SCENARIOS WITH TIGHT CONSTRAINTS

def test_extreme_overtime_pressure():
    """Test with extremely tight overtime limits that conflict with shift demand"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("emp1", ["nursing"], 4, 0, 24, base_datetime),  # Only 4 hours max
        create_employee("emp2", ["nursing"], 4, 0, 24, base_datetime),  # Only 4 hours max
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 8, base_datetime),  # 8-hour shift
        create_shift("shift2", "nursing", 8, 8, base_datetime),  # Another 8-hour shift
        create_shift("shift3", "nursing", 16, 4, base_datetime), # 4-hour shift
        create_shift("shift4", "nursing", 20, 4, base_datetime), # Another 4-hour shift
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
        # Should only be able to assign the shorter shifts
        assigned_hours_per_emp = {}
        for assignment in response.assignments:
            shift = next(s for s in shifts if s.id == assignment.shift_id)
            if assignment.employee_id not in assigned_hours_per_emp:
                assigned_hours_per_emp[assignment.employee_id] = 0
            assigned_hours_per_emp[assignment.employee_id] += shift.duration_hours
        
        for emp_id, hours in assigned_hours_per_emp.items():
            assert hours <= 4  # Respect overtime limits
    
    # Should have unassigned shifts due to overtime constraints
    assert len(response.unassigned_shifts) >= 2


def test_minimal_availability_windows():
    """Test with very narrow availability windows that barely overlap with shifts"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 2, base_datetime),    # Available 0-2 hours only
        create_employee("emp2", ["nursing"], 40, 2, 2, base_datetime),    # Available 2-4 hours only
        create_employee("emp3", ["nursing"], 40, 4, 2, base_datetime),    # Available 4-6 hours only
    ]
    shifts = [
        create_shift("shift1", "nursing", 0, 3, base_datetime),   # 0-3 hours (spans emp1 and emp2)
        create_shift("shift2", "nursing", 1, 4, base_datetime),   # 1-5 hours (spans multiple employees)
        create_shift("shift3", "nursing", 3, 3, base_datetime),   # 3-6 hours (spans emp2 and emp3)
        create_shift("shift4", "nursing", 5, 2, base_datetime),   # 5-7 hours (barely overlaps emp3)
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
    
    # With such tight availability windows, expect very limited assignments
    if response.success:
        assert len(response.assignments) <= 2
    assert len(response.unassigned_shifts) >= 2


def test_impossible_skill_requirements():
    """Test with shifts requiring skills that no employees possess"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("emp1", ["nursing"], 40, 0, 24, base_datetime),
        create_employee("emp2", ["admin"], 40, 0, 24, base_datetime),
    ]
    shifts = [
        create_shift("shift1", "surgery", 0, 8, base_datetime),       # No one has surgery skill
        create_shift("shift2", "radiology", 8, 8, base_datetime),    # No one has radiology skill
        create_shift("shift3", "anesthesia", 16, 8, base_datetime),  # No one has anesthesia skill
        create_shift("shift4", "nursing", 0, 8, base_datetime),      # Only this one is possible
        create_shift("shift5", "admin", 8, 8, base_datetime),        # Only this one is possible
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
        # Should only assign shifts that match available skills
        assert len(response.assignments) <= 2
        assigned_shift_ids = [a.shift_id for a in response.assignments]
        assert "shift4" in assigned_shift_ids or "shift5" in assigned_shift_ids
    
    # Impossible shifts should be unassigned
    assert len(response.unassigned_shifts) >= 3
    assert "shift1" in response.unassigned_shifts
    assert "shift2" in response.unassigned_shifts
    assert "shift3" in response.unassigned_shifts


def test_cascading_constraint_conflicts():
    """Test where satisfying one constraint makes it impossible to satisfy others"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("critical_emp", ["ICU"], 8, 0, 6, base_datetime),  # Key employee with limited hours and availability
        create_employee("regular_emp", ["nursing"], 40, 0, 24, base_datetime),
    ]
    shifts = [
        create_shift("icu1", "ICU", 0, 4, base_datetime),      # Requires critical_emp
        create_shift("icu2", "ICU", 3, 4, base_datetime),      # Also requires critical_emp, overlaps
        create_shift("icu3", "ICU", 6, 4, base_datetime),      # Outside availability window
        create_shift("nursing1", "nursing", 0, 8, base_datetime),  # Regular nursing
        create_shift("nursing2", "nursing", 8, 8, base_datetime),  # Regular nursing
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
        # Should handle cascading conflicts gracefully
        icu_assignments = [a for a in response.assignments 
                          if next(s for s in shifts if s.id == a.shift_id).required_skill == "ICU"]
        assert len(icu_assignments) <= 1  # Can only assign one ICU shift due to constraints
    
    # Should have unassigned ICU shifts due to conflicts
    icu_unassigned = [s for s in response.unassigned_shifts 
                     if next(shift for shift in shifts if shift.id == s).required_skill == "ICU"]
    assert len(icu_unassigned) >= 1


def test_maximum_constraint_pressure_scenario():
    """Ultimate stress test with all constraints under maximum pressure"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)

    employees = [
        create_employee("specialist1", ["cardiology"], 6, 0, 3, base_datetime),     # Very limited specialist
        create_employee("specialist2", ["neurology"], 6, 2, 3, base_datetime),     # Another limited specialist
        create_employee("generalist", ["nursing"], 10, 0, 8, base_datetime),       # General nursing
        create_employee("part_time", ["admin"], 4, 4, 2, base_datetime),           # Very part-time admin
    ]
    shifts = [
        create_shift("cardio1", "cardiology", 0, 2, base_datetime),
        create_shift("cardio2", "cardiology", 1, 2, base_datetime),      # Overlaps with cardio1
        create_shift("neuro1", "neurology", 2, 2, base_datetime),
        create_shift("neuro2", "neurology", 3, 2, base_datetime),        # Overlaps with neuro1
        create_shift("admin1", "admin", 4, 1, base_datetime),
        create_shift("admin2", "admin", 5, 1, base_datetime),            # Back-to-back admin shifts
        create_shift("nursing1", "nursing", 0, 6, base_datetime),        # Long nursing shift
        create_shift("emergency", "emergency", 2, 4, base_datetime),     # No one has this skill
        create_shift("surgery", "surgery", 6, 4, base_datetime),         # No one has this skill
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
    
    assert response.success
    # Under maximum pressure, expect very limited success
    if response.success:
        assert len(response.assignments) == 5  # Very few assignments possible
        
        # Verify all constraints are still respected
        employee_hours = {}
        for assignment in response.assignments:
            shift = next(s for s in shifts if s.id == assignment.shift_id)
            employee = next(e for e in employees if e.id == assignment.employee_id)
            
            # Check skill matching
            assert shift.required_skill in employee.skills
            
            # Track hours for overtime verification
            if assignment.employee_id not in employee_hours:
                employee_hours[assignment.employee_id] = 0
            employee_hours[assignment.employee_id] += shift.duration_hours
        
        # Verify overtime limits respected
        for emp_id, hours in employee_hours.items():
            employee = next(e for e in employees if e.id == emp_id)
            assert hours <= employee.max_hours
    


def test_performance_under_extreme_load():
    """Test scheduler performance with many employees and shifts under tight constraints"""
    scheduler = ShiftScheduler()
    base_datetime = datetime(2025, 7, 7, 8, 0)
    
    # Create many employees with varying tight constraints
    employees = []
    skills_pool = ["nursing", "doctor", "admin", "ICU", "emergency"]
    for i in range(15):
        skill = [skills_pool[i % len(skills_pool)]]
        max_hours = 4 + (i % 3) * 2  # 4, 6, or 8 hours max
        avail_start = i % 6  # Staggered start times
        avail_duration = 2 + (i % 3)  # 2, 3, or 4 hour windows
        employees.append(create_employee(f"emp{i}", skill, max_hours, avail_start, avail_duration, base_datetime))
    
    # Create many overlapping shifts
    shifts = []
    for i in range(30):
        required_skill = skills_pool[i % len(skills_pool)]
        start_offset = i * 0.5  # Shifts every 30 minutes
        duration = 1 + (i % 3)  # 1, 2, or 3 hour shifts
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
    print(f"Execution time: {execution_time:.2f} seconds with {len(employees)} employees and {len(shifts)} shifts")
    
    # Performance and correctness expectations
    assert execution_time < 30.0  # Should complete within 30 seconds
    assert response is not None
    
    if response.success:
        # Verify constraints are still respected even under load
        assert len(response.assignments) >= 1
        
        # Quick constraint verification
        for assignment in response.assignments:
            shift = next(s for s in shifts if s.id == assignment.shift_id)
            employee = next(e for e in employees if e.id == assignment.employee_id)
            assert shift.required_skill in employee.skills
    
    # Should handle the complexity without crashing
    assert response.assignments is not None
    assert response.unassigned_shifts is not None
