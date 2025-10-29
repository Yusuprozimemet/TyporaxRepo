"""
Centralized logging configuration for the application.

This module provides a single place to configure logging for the entire application,
ensuring consistent logging behavior across all modules and environments.
"""

import logging
import os
import sys


def init_logging():
    """
    Initialize logging configuration for the application.
    
    Sets up logging with:
    - Level from LOG_LEVEL environment variable (default: INFO)
    - Standard format with timestamp, logger name, level, and message
    - StreamHandler to stdout for console output
    - Only configures logging once to avoid conflicts
    
    This function should be called once at application startup.
    """
    # Only configure logging if it hasn't been configured yet
    # Check if root logger already has handlers to avoid double configuration
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return
    
    # Get log level from environment variable, default to INFO
    log_level_str = os.environ.get('LOG_LEVEL', 'INFO').upper()
    
    # Map string to logging level
    log_level_map = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }
    
    log_level = log_level_map.get(log_level_str, logging.INFO)
    
    # Configure basic logging
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s %(name)s %(levelname)s %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ],
        force=True  # Force reconfiguration if already configured
    )
    
    # Set SQLAlchemy logging to INFO to reduce noise in DEBUG mode
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    
    # Log the configuration for debugging
    logging.getLogger(__name__).info(f"Logging initialized with level: {log_level_str}")


def get_logger(name):
    """
    Get a logger instance with the given name.
    
    Args:
        name (str): Name of the logger, typically __name__ of the calling module
        
    Returns:
        logging.Logger: Configured logger instance
    """
    return logging.getLogger(name)