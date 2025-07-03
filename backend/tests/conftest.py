"""
Test configuration and fixtures for the schedule optimization API.

This module provides pytest fixtures and configuration for testing
the FastAPI application and its components.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from app.main import app
from app.models.schemas import (
    Employee, Shift, Assignment, EmployeeAvailability,
    ScheduleOptimizationRequest, ConstraintType
)


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    return TestClient(app)


@pytest.fixture
def sample_employee():
    """Create a sample employee for testing."""
    return Employee(
        id="E1",
        name="John Doe",
        skills=["cook", "cashier"],
        max_hours=80,
        availability=EmployeeAvailability(
            start=datetime(2025, 7, 1, 8, 0),
            end=datetime(2025, 7, 14, 22, 0)
        )
    )


@pytest.fixture
def sample_shift():
    """Create a sample shift for testing."""
    return Shift(
        id="S1",
        role="morning_cook",
        start_time=datetime(2025, 7, 1, 9, 0),
        end_time=datetime(2025, 7, 1, 17, 0),
        required_skill="cook"
    )


@pytest.fixture
def sample_optimization_request(sample_employee, sample_shift):
    """Create a sample optimization request for testing."""
    return ScheduleOptimizationRequest(
        period="2025-07-01/2025-07-14",
        employees=[sample_employee],
        shifts=[sample_shift],
        current_assignments=[],
        constraints=[ConstraintType.SKILL_MATCHING, ConstraintType.OVERTIME_LIMITS]
    )
