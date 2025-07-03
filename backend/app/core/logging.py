"""
Logging configuration module.

This module sets up structured logging for the application using loguru.
"""

import sys
from loguru import logger
from .settings import settings


def setup_logging() -> None:
    """
    Configure application logging using loguru.
    
    Sets up console logging with appropriate format and level
    based on application settings.
    """
    # Remove default handler
    logger.remove()
    
    # Add console handler with custom format
    logger.add(
        sys.stdout,
        format=settings.log_format,
        level=settings.log_level,
        colorize=True,
        backtrace=True,
        diagnose=True
    )
    
    # Add file handler for production
    if not settings.debug:
        logger.add(
            "logs/app.log",
            rotation="500 MB",
            retention="10 days",
            compression="gzip",
            format=settings.log_format,
            level=settings.log_level
        )
    
    logger.info("Logging configured successfully")
