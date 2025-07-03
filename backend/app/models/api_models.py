from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from enum import Enum
from models.schemas import Employee, Shift, Assignment, ConstraintType, OptimizationMetrics

class ScheduleOptimizationRequest(BaseModel):
    """Request model for schedule optimization."""
    period: str = Field(..., description="Period in ISO format (e.g., '2025-07-01/2025-07-14')")
    employees: List[Employee] = Field(..., min_items=1, description="List of available employees")
    shifts: List[Shift] = Field(..., min_items=1, description="List of shifts to be assigned")
    current_assignments: List[Assignment] = Field(
        default=[], 
        description="Current assignments to consider in optimization"
    )
    constraints: List[ConstraintType] = Field(
        default=[],
        description="List of constraints to apply during optimization"
    )

    @field_validator('period')
    def validate_period_format(cls, v):
        """Validate period format is correct."""
        try:
            start_str, end_str = v.split('/')
            datetime.fromisoformat(start_str)
            datetime.fromisoformat(end_str)
        except (ValueError, TypeError):
            raise ValueError('Period must be in format "YYYY-MM-DD/YYYY-MM-DD"')
        return v


class ScheduleOptimizationResponse(BaseModel):
    """Response model for schedule optimization."""
    success: bool = Field(..., description="Whether optimization was successful")
    assignments: List[Assignment] = Field(..., description="Optimized shift assignments")
    unassigned_shifts: List[str] = Field(..., description="List of unassigned shift IDs")
    metrics: OptimizationMetrics = Field(..., description="Optimization performance metrics")
    constraints_applied: List[str] = Field(..., description="List of applied constraint types")
    message: Optional[str] = Field(None, description="Additional information or error message")


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Current server timestamp")
    version: str = Field(..., description="API version")