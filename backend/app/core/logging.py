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
    for level, format_str in settings.log_level_format:
        logger.add(
            sys.stderr,
            format=format_str,
            level=level,
            colorize=True,
            backtrace=True,
            diagnose=True,
        )

    # Add file handler for production
    if not settings.debug:
        logger.add(
            "logs/app.log",
            rotation="500 MB",
            retention="10 days",
            compression="gzip",
            format=settings.log_level_format[0][1],  # Use the first format as default
            level=settings.log_level_format[0][0],  # Use the first level as default
        )

    logger.info("Logging configured successfully")
