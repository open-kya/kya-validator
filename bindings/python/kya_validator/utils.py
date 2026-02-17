"""
Shared utility functions for KYA Validator.

This module provides helper functions used across multiple
modules in the KYA Validator package.
"""

import json
import logging
from typing import Any, Optional
from pathlib import Path


def validate_json(json_str: str) -> bool:
    """Check if a string is valid JSON.

    Parameters
    ----------
    json_str : str
        String to validate.

    Returns
    -------
    bool
        True if string is valid JSON, False otherwise.

    Examples
    --------
    >>> validate_json('{"test": true}')
    True
    >>> validate_json('not json')
    False
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
    ValueError
        If input is not valid JSON.
    """
    try:
        data = json.loads(json_str)
        return json.dumps(data, indent=indent, ensure_ascii=False)
    except json.JSONDecodeError as e:
        raise ValueError(f'Invalid JSON: {e}')


def get_logger(name: str, level: int = logging.WARNING) -> logging.Logger:
    """Get or create a logger with the specified name.

    Parameters
    ----------
    name : str
        Logger name (typically __name__ of calling module).
    level : int, optional
        Logging level. Default is logging.WARNING.

    Returns
    -------
    logging.Logger
        Configured logger instance.

    Examples
    --------
    >>> logger = get_logger(__name__)
    >>> logger.info('Starting validation')
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(level)

    return logger


def ensure_dir(path: Path) -> Path:
    """Ensure a directory exists, creating it if necessary.

    Parameters
    ----------
    path : Path
        Directory path to ensure.

    Returns
    -------
    Path
        The path (same as input).

    Raises
    ------
    OSError
        If directory cannot be created.
    """
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_load_json(
    path: Path,
    default: Optional[Any] = None,
) -> Any:
    """Safely load JSON from a file.

    Parameters
    ----------
    path : Path
        Path to JSON file.
    default : Any, optional
        Default value if file doesn't exist.

    Returns
    -------
    Any
        Parsed JSON data or default value.

    Examples
    --------
    >>> data = safe_load_json(Path('config.json'), default={})
    """
    if not path.exists():
        return default

    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        get_logger(__name__).warning(
            f'Failed to load JSON from {path}: {e}'
        )
        return default


def safe_save_json(path: Path, data: Any) -> bool:
    """Safely save data to a JSON file.

    Parameters
    ----------
    path : Path
        Path to output file.
    data : Any
        Data to save (must be JSON serializable).

    Returns
    -------
    bool
        True if save succeeded, False otherwise.

    Examples
    --------
    >>> safe_save_json(Path('output.json'), {'result': 'success'})
    True
    """
    try:
        ensure_dir(path.parent)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except (TypeError, IOError) as e:
        get_logger(__name__).error(
            f'Failed to save JSON to {path}: {e}'
        )
        return False


def truncate_string(s: str, max_length: int, suffix: str = '...') -> str:
    """Truncate a string to maximum length with optional suffix.

    Parameters
    ----------
    s : str
        String to truncate.
    max_length : int
        Maximum length for output.
    suffix : str, optional
        Suffix to add if truncated. Default is '...'.

    Returns
    -------
    str
        Truncated string.

    Examples
    --------
    >>> truncate_string('This is a very long string', 10)
    'This is...'
    """
    if len(s) <= max_length:
        return s
    return s[:max_length - len(suffix)] + suffix


def normalize_did(did: str) -> str:
    """Normalize a DID string.

    Parameters
    ----------
    did : str
        DID string to normalize.

    Returns
    -------
    str
        Normalized DID string.

    Examples
    --------
    >>> normalize_did('DID:KEY:ABC123')
    'did:key:abc123'
    """
    return did.lower().strip()


def is_hex_string(s: str) -> bool:
    """Check if a string is a valid hexadecimal string.

    Parameters
    ----------
    s : str
        String to check.

    Returns
    -------
    bool
        True if string is valid hex, False otherwise.

    Examples
    --------
    >>> is_hex_string('0xabc123')
    True
    >>> is_hex_string('not hex')
    False
    """
    s = s.lower()
    if s.startswith('0x'):
        s = s[2:]
    try:
        int(s, 16)
        return True
    except ValueError:
        return False


def hex_to_int(hex_str: str) -> Optional[int]:
    """Convert hex string to integer.

    Parameters
    ----------
    hex_str : str
        Hex string (with or without '0x' prefix).

    Returns
    -------
    int or None
        Integer value or None if invalid.

    Examples
    --------
    >>> hex_to_int('0x10')
    16
    >>> hex_to_int('abc')
    None
    """
    try:
        if hex_str.startswith('0x'):
            return int(hex_str[2:], 16)
        return int(hex_str, 16)
    except ValueError:
        return None


def int_to_hex(value: int, prefix: bool = True) -> str:
    """Convert integer to hex string.

    Parameters
    ----------
    value : int
        Integer value to convert.
    prefix : bool, optional
        Whether to add '0x' prefix. Default is True.

    Returns
    -------
    str
        Hex string representation.

    Examples
    --------
    >>> int_to_hex(16)
    '0x10'
    >>> int_to_hex(255, prefix=False)
    'ff'
    """
    hex_str = hex(value)[2:]
    return f'0x{hex_str}' if prefix else hex_str


def merge_dicts(*dicts: dict[str, Any]) -> dict[str, Any]:
    """Merge multiple dictionaries.

    Later dictionaries override earlier ones for conflicting keys.

    Parameters
    ----------
    *dicts : dict
        Dictionaries to merge (variadic).

    Returns
    -------
    dict
        Merged dictionary.

    Examples
    --------
    >>> merge_dicts({'a': 1}, {'b': 2}, {'a': 3})
    {'a': 3, 'b': 2}
    """
    result = {}
    for d in dicts:
        result.update(d)
    return result
