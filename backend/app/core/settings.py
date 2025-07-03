from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings configuration."""
    
    # API Configuration
    app_name: str = "Schedule Optimization API"
    app_description: str = """
    Advanced employee scheduling optimization system using Integer Linear Programming (ILP).
    
    This API provides intelligent workforce scheduling capabilities with support for:
    - Multi-skill employee management
    - Advanced constraint handling
    - Real-time optimization
    - Comprehensive reporting and metrics
    """

    # Application Version
    app_version: str = "1.0.0"

    # Server Configuration
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS Configuration
    allowed_origins: List[str] = ["*"]
    allowed_methods: List[str] = ["*"]
    allowed_headers: List[str] = ["*"]

    # Logging Configuration
    log_level_format: list[str]=[
        ["INFO","<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"]
    ]


# Global settings instance
settings = Settings()
