"""
Health check API router.

This module provides health check endpoints for monitoring
the application status and dependencies.
"""

from datetime import datetime
from fastapi import APIRouter, status, HTTPException
from loguru import logger
import pulp

from models.api_models import HealthResponse

# Create router for health check endpoints
router = APIRouter(
    prefix="/api",
    tags=["Health Check"],
    responses={
        200: {"description": "Service is healthy"},
        503: {"description": "Service unavailable"}
    }
)


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Backend availability check",
    description="""
    Check the health status of the schedule optimization service.
    
    This endpoint provides information about:
    - Overall service status
    - Current timestamp
    - API version
    - Status of external dependencies (optimization solver, etc.)
    
    Use this endpoint for:
    - Load balancer health checks
    - Monitoring system integration
    - Debugging connectivity issues
    """,
    response_description="Health status information"
)
async def health_check() -> HealthResponse:
    """
    Perform a health check of the service and its dependencies.
    
    Returns:
        HealthResponse: Current health status and dependency information
    """
    try:
        logger.info("Health check requested")
        
        # Check PuLP solver availability
        solver_status = _check_solver_availability()
        
        # Check other dependencies as needed
        dependencies = {
            "pulp_solver": solver_status,
            "logging": "healthy",
            "pydantic": "healthy"
        }
        
        # Determine overall status
        overall_status = "healthy" if all(
            status == "healthy" for status in dependencies.values()
        ) else "degraded"
        
        response = HealthResponse(
            status=overall_status,
            timestamp=datetime.now(),
            version="1.0.0",
            dependencies=dependencies
        )
        
        logger.info(f"Health check completed: {overall_status}")
        return response
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health check error: " + str(e)
        )


def _check_solver_availability() -> str:
    """
    Check if the optimization solver is available and working.
    
    Returns:
        str: Status of the solver ("healthy", "degraded", or "unhealthy")
    """
    try:
        # Create a simple test problem
        test_problem = pulp.LpProblem("HealthTest", pulp.LpMaximize)
        x = pulp.LpVariable("x", lowBound=0)
        test_problem += x
        test_problem += x <= 1
        
        # Try to solve it
        solver = pulp.PULP_CBC_CMD(msg=0)
        status = test_problem.solve(solver)
        
        if status == pulp.LpStatusOptimal:
            return "healthy"
        else:
            return "degraded"
            
    except Exception as e:
        logger.error(f"Solver health check failed: {str(e)}")
        return "unhealthy"
