from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from core.settings import settings
from core.logging import setup_logging
from routers import schedule, health


def create_application() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        FastAPI: Configured application instance
    """
    # Setup logging first
    setup_logging()
    
    # Create FastAPI app with comprehensive metadata
    app = FastAPI(
        title=settings.app_name,
        description=settings.app_description,
        version=settings.app_version,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        contact={
            "name": "Andrew Ayman",
            "email": "andrewayman9@gmail.com",
        },
        license_info={
            "name": "MIT License",
            "url": "https://opensource.org/licenses/MIT",
        },
        tags_metadata=[
            {
                "name": "Schedule Optimization",
                "description": "Employee scheduling optimization using ILP algorithms",
            },
            {
                "name": "Health Check",
                "description": "Service health monitoring and status endpoints",
            }
        ]
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=settings.allowed_methods,
        allow_headers=settings.allowed_headers,
    )
    
    # Include routers
    app.include_router(schedule.router)
    app.include_router(health.router)
    
    return app


# Create the application instance
app = create_application()


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level_format[0][0].lower()
    )
