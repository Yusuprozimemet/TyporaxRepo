"""
Application factory module.

This module provides the create_app function for creating and configuring
the Flask application instance.
"""

from .logging_config import init_logging


def create_app():
    """
    Create and configure the Flask application.
    
    This function initializes logging and can be extended to include
    other application configuration and setup.
    
    Returns:
        Flask: Configured Flask application instance
    """
    # Initialize logging first, before any other imports that might use logging
    init_logging()
    
    # Import and return the app (currently defined in app.py)
    # In the future, this could be refactored to create the app here
    from ..app import app
    return app
