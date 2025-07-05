from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class ConstraintType(str, Enum):
    """Enumeration of available constraint types for optimization."""
    SKILL_MATCHING = "skill_matching"
    OVERTIME_LIMITS = "overtime_limits"
    AVAILABILITY_WINDOWS = "availability_windows"
    NO_OVERLAPPING = "no_overlapping"

class Employee(BaseModel):
    """Model representing an employee in the scheduling system."""
    id: str = Field(..., description="Unique identifier for the employee")
    name: str = Field(..., description="Full name of the employee")
    skills: List[str] = Field(..., description="List of skills the employee possesses")
    max_hours: int = Field(..., ge=0, le=168, description="Maximum weekly hours (0-168)")
    availability_start: datetime = Field(..., description="Start time of availability")
    availability_end: datetime = Field(..., description="End time of availability")

    @field_validator('skills')
    def skills_not_empty(cls, v):
        """Validate that employee has at least one skill."""
        if not v:
            raise ValueError('Employee must have at least one skill')
        return v
    
    @field_validator('availability_end')
    def end_after_start(cls, v, info):
        """Validate that end time is after start time."""
        start = info.data.get('availability_start')
        if start and v <= start:
            raise ValueError('End time must be after start time')
        return v


class Shift(BaseModel):
    """Model representing a work shift."""
    id: str = Field(..., description="Unique identifier for the shift")
    role: str = Field(..., description="Role/position for this shift")
    start_time: datetime = Field(..., description="Shift start time")
    end_time: datetime = Field(..., description="Shift end time")
    required_skill: str = Field(..., description="Required skill for this shift")

    @field_validator('end_time')
    def end_after_start(cls, v, info):
        """Validate that shift end time is after start time."""
        start_time = info.data.get('start_time')
        if start_time and v <= start_time:
            raise ValueError('Shift end time must be after start time')
        return v

    @property
    def duration_hours(self) -> float:
        """Calculate shift duration in hours."""
        delta = self.end_time - self.start_time
        return delta.total_seconds() / 3600


class Assignment(BaseModel):
    """Model representing a shift assignment."""
    shift_id: str = Field(..., description="ID of the assigned shift")
    employee_id: str = Field(..., description="ID of the assigned employee")


class OptimizationMetrics(BaseModel):
    """Model containing optimization performance metrics."""
    total_overtime_minutes: int = Field(..., ge=0, description="Total overtime in minutes")
    constraint_violations: int = Field(..., ge=0, description="Number of constraint violations")
    optimization_time_ms: int = Field(..., ge=0, description="Optimization time in milliseconds")
    objective_value: float = Field(..., description="Final objective function value")
