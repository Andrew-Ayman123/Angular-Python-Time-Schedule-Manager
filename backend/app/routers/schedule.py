from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from loguru import logger

from models.api_models import (
    ShiftScheduleRequest,
    ShiftScheduleResponse
)
from services.shift_scheduler import ShiftScheduler

# Create router with prefix and tags for OpenAPI documentation
router = APIRouter(
    prefix="/api/schedule",
    tags=["Schedule Optimization"],
    responses={
        500: {"description": "Internal server error"},
        400: {"description": "Bad request"}
    }
)


def get_scheduler() -> ShiftScheduler:
    """
    Create a new scheduler instance for each request.
    
    This ensures thread safety when handling multiple concurrent requests.
    Each request gets its own scheduler instance with isolated state.
    
    Returns:
        ShiftScheduler: A new scheduler instance
    """
    return ShiftScheduler()


@router.post(
    "/optimize",
    response_model=ShiftScheduleResponse,
    status_code=status.HTTP_200_OK,
    summary="Run ILP optimization with advanced constraints",
    description="""
    Optimize employee scheduling using Integer Linear Programming (ILP).
    
    This endpoint takes a list of employees, shifts, and constraints, then
    returns an optimized assignment that maximizes efficiency while
    respecting all specified constraints.
    """,
    response_description="Optimized schedule with assignments and metrics"
)
async def optimize_schedule(
    request: ShiftScheduleRequest
) -> ShiftScheduleResponse:
    """
    Optimize employee schedule using ILP.
    
    Args:
        request: Schedule optimization request containing employees, shifts, and constraints
        
    Returns:
        ScheduleOptimizationResponse: Optimized assignments with metrics
        
    Raises:
        HTTPException: If optimization fails due to invalid input or system error
    """
    try:
        logger.info(f"Received optimization request for period: {request.period}")
        logger.info(f"Employees: {len(request.employees)}, Shifts: {len(request.shifts)}")
        
        # Validate input data
        _validate_optimization_request(request)
        
        # Create a new scheduler instance for this request (thread-safe)
        scheduler = get_scheduler()
        
        # Perform optimization
        result = scheduler.schedule(request)
        
        if result.success:
            logger.info(f"Optimization successful: {len(result.assignments)} assignments")
        else:
            logger.warning(f"Optimization failed: {result.message}")
        
        return result
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Optimization service error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal optimization service error"
        )


def _validate_optimization_request(request: ShiftScheduleRequest) -> None:
    """
    Validate the optimization request for business logic constraints.
    
    Args:
        request: The optimization request to validate
        
    Raises:
        ValueError: If validation fails
    """
    # Validate period dates
    start_str, end_str = request.period.split('/')
    start_date = datetime.fromisoformat(start_str)
    end_date = datetime.fromisoformat(end_str)
    
    if start_date >= end_date:
        raise ValueError("Period start date must be before end date")
    
    # Validate that shifts are within the period
    for shift in request.shifts:
        if not (start_date <= shift.start_time.replace(tzinfo=None) <= end_date):
            raise ValueError(f"Shift {shift.id} is outside the specified period")
        if not (start_date <= shift.end_time.replace(tzinfo=None) <= end_date):
            raise ValueError(f"Shift {shift.id} is outside the specified period")
    
    # Log skills availability information (but don't raise error)
    available_skills = set()
    for employee in request.employees:
        available_skills.update(employee.skills)
    
    required_skills = {shift.required_skill for shift in request.shifts}
    missing_skills = required_skills - available_skills
    
    if missing_skills:
        logger.warning(f"No employees available with required skills: {missing_skills}. "
                      f"Shifts requiring these skills will likely remain unassigned.")
    
    # Validate current assignments reference valid employees and shifts (log warnings instead of errors)
    employee_ids = {emp.id for emp in request.employees}
    shift_ids = {shift.id for shift in request.shifts}
    
    for assignment in request.current_assignments:
        if assignment.employee_id not in employee_ids:
            logger.warning(f"Assignment references unknown employee: {assignment.employee_id}. "
                          f"This assignment will be ignored.")
        if assignment.shift_id not in shift_ids:
            logger.warning(f"Assignment references unknown shift: {assignment.shift_id}. "
                          f"This assignment will be ignored.")
    
    logger.info("Request validation passed")
