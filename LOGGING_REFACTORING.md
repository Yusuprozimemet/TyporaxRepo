# Logging Configuration Refactoring

## Overview

This document describes the refactoring of the logging configuration in the TyporaxRepo application to centralize logging setup and eliminate conflicts from multiple `logging.basicConfig()` calls.

## Problem Solved

**Before:** Multiple modules (`app.py`, `src/utils.py`, `src/blueprints/auth.py`) were calling `logging.basicConfig()`, which only works for the first call and causes inconsistent logging behavior across the application.

**After:** Centralized logging configuration in `src/logging_config.py` with a single initialization point.

## Changes Made

### 1. Created `src/logging_config.py`

New module that provides:
- `init_logging()` function that configures logging once
- `get_logger(name)` function for getting logger instances
- Environment variable support for log level (`LOG_LEVEL`)
- Consistent format: `"%(asctime)s %(name)s %(levelname)s %(message)s"`
- StreamHandler to stdout for both dev and prod environments

### 2. Updated `src/__init__.py`

Added `create_app()` function that:
- Calls `init_logging()` early in the application lifecycle
- Can be extended for other app configuration in the future

### 3. Refactored `app.py`

- Imports and calls `init_logging()` at the start
- Uses `get_logger(__name__)` for module-specific logger
- Replaced all `logging.*` calls with `logger.*` calls
- Removed the original `logging.basicConfig()` call

### 4. Cleaned up other modules

Removed `logging.basicConfig()` calls from:
- `src/utils.py`
- `src/blueprints/auth.py`

## Configuration

### Environment Variables

- `LOG_LEVEL`: Controls logging level (default: `INFO`)
  - Supported values: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

### Examples

```bash
# Development with debug logging
export LOG_LEVEL=DEBUG
python app.py

# Production with info logging (default)
export LOG_LEVEL=INFO
python app.py

# Production with minimal logging
export LOG_LEVEL=WARNING
python app.py
```

## Usage

### In existing modules

No changes needed for modules that just import `logging` and use it normally:

```python
import logging

# This will now use the centralized configuration
logger = logging.getLogger(__name__)
logger.info("This will use the centralized format")
```

### In new modules

Recommended approach using the new helper:

```python
from src.logging_config import get_logger

logger = get_logger(__name__)
logger.info("This uses the centralized configuration")
```

## Benefits

1. **Consistent Logging**: All modules now use the same format and configuration
2. **Environment Control**: Log level configurable via environment variable
3. **No Conflicts**: Single point of configuration eliminates conflicts
4. **Production Ready**: Works in both development and production environments
5. **Maintainable**: All logging configuration in one place

## Testing

Run the included test scripts to verify the configuration:

```bash
# Test the logging functionality
python test_logging_simple.py
```

Expected output shows:
- ✓ Centralized configuration working
- ✓ Environment variable LOG_LEVEL support
- ✓ Consistent format with timestamp, name, level, message
- ✓ Multiple loggers working without conflicts
- ✓ Log level filtering working correctly

## Migration Notes

- All existing `logging.*` calls continue to work unchanged
- The SQLAlchemy engine logger is automatically set to INFO level to reduce noise
- The `force=True` parameter in `basicConfig` ensures reconfiguration works if needed
- Modules can be imported in any order without logging conflicts

## Future Enhancements

Potential improvements that can be added to `src/logging_config.py`:

1. **File Logging**: Add file handlers for persistent logs
2. **Log Rotation**: Implement log file rotation
3. **Structured Logging**: Add JSON formatting for production
4. **Custom Formatters**: Different formats for different environments
5. **Performance Logging**: Specialized loggers for performance metrics