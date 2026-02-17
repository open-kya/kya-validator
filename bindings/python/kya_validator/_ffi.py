"""
FFI (Foreign Function Interface) layer for KYA Validator.

This module provides thin wrappers over PyO3-exposed Rust functions
from the _core module, handling type conversions and error mapping.
"""

from typing import Optional
import json
from . import _core
from .errors import (
    KyaValidatorError,
    InvalidInputError,
    CoreError,
)


def validate_manifest_json(manifest_json: str) -> str:
    """Validate a manifest JSON string using default configuration.

    This is a thin wrapper around the Rust validate_manifest_json function.

    Parameters
    ----------
    manifest_json : str
        Manifest JSON string to validate.

    Returns
    -------
    str
        JSON string of validation report.

    Raises
    ------
    InvalidInputError
        If manifest JSON is invalid.
    CoreError
        If Rust core validation fails.
    """
    try:
        return _core.validate_manifest_json(manifest_json)
    except Exception as e:
        # Check if it's a PyO3 exception
        error_msg = str(e)
        if 'Invalid JSON' in error_msg or 'Failed to parse' in error_msg:
            raise InvalidInputError(error_msg)
        raise CoreError(f'Rust core error: {error_msg}')


def validate_manifest_json_with_config(
    manifest_json: str,
    config_json: str,
) -> str:
    """Validate a manifest JSON string with custom configuration.

    This is a thin wrapper around the Rust
    validate_manifest_json_with_config function.

    Parameters
    ----------
    manifest_json : str
        Manifest JSON string to validate.
    config_json : str
        Configuration JSON string.

    Returns
    -------
    str
        JSON string of validation report.

    Raises
    ------
    InvalidInputError
        If manifest or config JSON is invalid.
    CoreError
        If Rust core validation fails.
    """
    try:
        return _core.validate_manifest_json_with_config(
            manifest_json,
            config_json,
        )
    except Exception as e:
        error_msg = str(e)
        if 'Invalid JSON' in error_msg or 'Failed to parse' in error_msg:
            raise InvalidInputError(error_msg)
        if 'Invalid config' in error_msg:
            raise InvalidInputError(f'Invalid configuration: {error_msg}')
        raise CoreError(f'Rust core error: {error_msg}')


def is_valid_json(json_str: str) -> bool:
    """Check if a string is valid JSON.

    Parameters
    ----------
    json_str : str
        String to validate.

    Returns
    -------
    bool
        True if string is valid JSON, False otherwise.
    """
    try:
        json.loads(json_str)
        return True
    except json.JSONDecodeError:
        return False


def format_json(json_str: str, indent: int = 2) -> str:
    """Format JSON string with pretty printing.

    Parameters
    ----------
    json_str : str
        JSON string to format.
    indent : int, optional
        Number of spaces for indentation. Default is 2.

    Returns
    -------
    str
        Formatted JSON string.

    Raises
    ------
    InvalidInputError
        If input is not valid JSON.
    """
    try:
        data = json.loads(json_str)
        return json.dumps(data, indent=indent, ensure_ascii=False)
    except json.JSONDecodeError as e:
        raise InvalidInputError(f'Invalid JSON: {e}')


def get_version() -> str:
    """Get the validator version from Rust core.

    Returns
    -------
    str
        Version string.
    """
    try:
        return _core.get_version()
    except AttributeError:
        # Fallback if not available
        return '0.2.0'


def get_name() -> str:
    """Get the validator name from Rust core.

    Returns
    -------
    str
        Name string.
    """
    try:
        return _core.get_name()
    except AttributeError:
        # Fallback if not available
        return 'kya-validator'


# Check for additional functions that may be exposed by PyO3
# These will be added as we expand the Rust bindings
_AVAILABLE_FUNCTIONS = {
    'validate_manifest_json',
    'validate_manifest_json_with_config',
}


def has_function(name: str) -> bool:
    """Check if a function is available in the Rust core.

    Parameters
    ----------
    name : str
        Function name to check.

    Returns
    -------
    bool
        True if function is available.
    """
    return name in _AVAILABLE_FUNCTIONS
