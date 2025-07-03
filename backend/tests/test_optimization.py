"""
Tests for the optimization service module.

This module contains unit tests for the schedule optimization
service and its components.
"""

import pytest
from datetime import datetime

from app.services.optimization_service import ScheduleOptimizer
from app.models.schemas import (
    Employee, Shift, EmployeeAvailability, ScheduleOptimizationRequest,
    ConstraintType
)


def test_optimizer_initialization():
    """Test that the optimizer initializes correctly."""
    optimizer = ScheduleOptimizer()
    assert optimizer.problem is None
    assert optimizer.variables == {}
    assert optimizer.employees == []
    assert optimizer.shifts == []
    assert optimizer.constraints_applied == []


def test_simple_optimization(sample_optimization_request):
    """Test a simple optimization scenario."""
    optimizer = ScheduleOptimizer()
    result = optimizer.optimize_schedule(sample_optimization_request)
    
    assert result.success is True
    assert len(result.assignments) <= len(sample_optimization_request.shifts)
    assert result.metrics.optimization_time_ms >= 0
    assert "skill_matching" in result.constraints_applied


def test_optimization_with_no_skilled_employees():
    """Test optimization when no employees have required skills."""
    # Create employee with different skills
    employee = Employee(
        id="E1",
        name="Jane Doe",
        skills=["server"],  # Different skill
        max_hours=40,
        availability=EmployeeAvailability(
            start=datetime(2025, 7, 1, 8, 0),
            end=datetime(2025, 7, 14, 22, 0)
        )
    )
    
    # Create shift requiring a different skill
    shift = Shift(
        id="S1",
        role="cook",
        start_time=datetime(2025, 7, 1, 9, 0),
        end_time=datetime(2025, 7, 1, 17, 0),
        required_skill="cook"  # Different skill
    )
    
    request = ScheduleOptimizationRequest(
        period="2025-07-01/2025-07-14",
        employees=[employee],
        shifts=[shift],
        constraints=[ConstraintType.SKILL_MATCHING]
    )
    
    optimizer = ScheduleOptimizer()
    result = optimizer.optimize_schedule(request)
    
    # Should still succeed but have no assignments
    assert len(result.assignments) == 0
    assert len(result.unassigned_shifts) == 1


def test_optimization_with_overtime_constraints():
    """Test optimization with overtime constraints."""
    # Create employee with low max hours
    employee = Employee(
        id="E1",
        name="John Doe",
        skills=["cook"],
        max_hours=5,  # Very low hours
        availability=EmployeeAvailability(
            start=datetime(2025, 7, 1, 8, 0),
            end=datetime(2025, 7, 14, 22, 0)
        )
    )
    
    # Create long shift
    shift = Shift(
        id="S1",
        role="cook",
        start_time=datetime(2025, 7, 1, 9, 0),
        end_time=datetime(2025, 7, 1, 17, 0),  # 8 hours
        required_skill="cook"
    )
    
    request = ScheduleOptimizationRequest(
        period="2025-07-01/2025-07-14",
        employees=[employee],
        shifts=[shift],
        constraints=[ConstraintType.SKILL_MATCHING, ConstraintType.OVERTIME_LIMITS]
    )
    
    optimizer = ScheduleOptimizer()
    result = optimizer.optimize_schedule(request)
    
    # Should not assign due to overtime constraints
    assert len(result.assignments) == 0
