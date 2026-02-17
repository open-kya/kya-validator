"""
Configuration management for KYA Validator.

This module provides configuration loading and management for
manifest validation, supporting JSON files, Python dicts,
and environment variables.
"""

import os
import json
from pathlib import Path
from typing import Optional, Union, Any
from .types import ValidationConfig, ValidationMode
from .errors import ConfigError


def load_config(
    source: Union[str, Path, dict[str, Any]],
    env_prefix: str = 'KYA_VALIDATOR_',
) -> ValidationConfig:
    """Load validation configuration from various sources.

    This function can load configuration from:
    - JSON file path (str or Path)
    - JSON string (str)
    - Python dictionary (dict)
    - Environment variables (with optional prefix)

    Environment variables override file/dict values and use
    the format: {PREFIX}_{KEY} where keys are converted
    from camelCase to UPPER_CASE.

    Parameters
    ----------
    source : str or Path or dict
        Configuration source. Can be a file path, JSON string,
        or Python dictionary.
    env_prefix : str, optional
        Prefix for environment variables. Default is 'KYA_VALIDATOR_'.

    Returns
    -------
    ValidationConfig
        Parsed configuration.

    Raises
    ------
    ConfigError
        If configuration cannot be loaded or parsed.
    """
    # Load base configuration
    if isinstance(source, dict):
        config_dict = source
    elif isinstance(source, (str, Path)):
        path = Path(source) if isinstance(source, str) else source
        if not path.exists():
            raise ConfigError(f'Configuration file not found: {path}')
        try:
            with open(path, 'r', encoding='utf-8') as f:
                config_dict = json.load(f)
        except json.JSONDecodeError as e:
            raise ConfigError(f'Invalid JSON in configuration: {e}')
        except IOError as e:
            raise ConfigError(f'Failed to read configuration: {e}')
    else:
        raise ConfigError(
            f'Invalid source type: {type(source)}. '
            'Expected str, Path, or dict.'
        )

    # Override with environment variables
    env_config = _load_env_config(env_prefix)

    # Merge environment config (env overrides file/dict)
    if env_config:
        config_dict = {**config_dict, **env_config}

    # Parse configuration
    try:
        return ValidationConfig.from_json(json.dumps(config_dict))
    except (KeyError, ValueError, TypeError) as e:
        raise ConfigError(f'Failed to parse configuration: {e}')


def _load_env_config(prefix: str) -> dict[str, Any]:
    """Load configuration from environment variables.

    Parameters
    ----------
    prefix : str
        Prefix for environment variables.

    Returns
    -------
    dict
        Configuration dictionary from environment variables.
    """
    config = {}

    for key, value in os.environ.items():
        if not key.startswith(prefix):
            continue

        # Remove prefix and convert to camelCase
        config_key = key[len(prefix):].lower()

        # Convert UPPER_CASE to camelCase
        parts = config_key.split('_')
        camel_key = parts[0] + ''.join(
            p.capitalize() for p in parts[1:]
        )

        # Parse value
        parsed_value = _parse_env_value(value)

        config[camel_key] = parsed_value

    return config


def _parse_env_value(value: str) -> Any:
    """Parse environment variable value to appropriate type.

    Parameters
    ----------
    value : str
        Environment variable value.

    Returns
    -------
    Any
        Parsed value (bool, int, float, or str).
    """
    # Boolean
    if value.lower() in ('true', 'false'):
        return value.lower() == 'true'

    # Integer
    try:
        return int(value)
    except ValueError:
        pass

    # Float
    try:
        return float(value)
    except ValueError:
        pass

    # String
    return value


def save_config(
    config: ValidationConfig,
    path: Union[str, Path],
) -> None:
    """Save validation configuration to a JSON file.

    Parameters
    ----------
    config : ValidationConfig
        Configuration to save.
    path : str or Path
        Output file path.

    Raises
    ------
    ConfigError
        If configuration cannot be saved.
    """
    path = Path(path) if isinstance(path, str) else path

    try:
        # Create parent directories if needed
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, 'w', encoding='utf-8') as f:
            f.write(config.to_json())
    except IOError as e:
        raise ConfigError(f'Failed to write configuration: {e}')


def create_preset(
    mode: str = 'self_audit',
) -> ValidationConfig:
    """Create a preset configuration.

    Parameters
    ----------
    mode : str, optional
        Preset mode: 'self_audit' or 'client_audit'.
        Default is 'self_audit'.

    Returns
    -------
    ValidationConfig
        Preset configuration.

    Raises
    ------
    ConfigError
        If mode is not recognized.
    """
    if mode == 'self_audit':
        return ValidationConfig.self_audit()
    elif mode == 'client_audit':
        return ValidationConfig.client_audit()
    else:
        raise ConfigError(
            f'Unknown preset mode: {mode}. '
            'Expected "self_audit" or "client_audit".'
        )


def merge_configs(
    *configs: ValidationConfig,
) -> ValidationConfig:
    """Merge multiple configurations.

    Later configurations override earlier ones for conflicting values.

    Parameters
    ----------
    *configs : ValidationConfig
        Configurations to merge (variadic).

    Returns
    -------
    ValidationConfig
        Merged configuration.
    """
    if not configs:
        return ValidationConfig.default()

    # Start with first config
    merged = configs[0]

    # Merge remaining configs
    for config in configs[1:]:
        # Override non-None values
        if config.allowed_kya_versions:
            merged.allowed_kya_versions = config.allowed_kya_versions
        if config.required_fields:
            merged.required_fields = config.required_fields
        if config.required_field_pairs:
            merged.required_field_pairs = config.required_field_pairs
        if config.allowed_controllers:
            merged.allowed_controllers = config.allowed_controllers
        if config.required_vc_types:
            merged.required_vc_types = config.required_vc_types

        # Override boolean values
        merged.enforce_controller_match = config.enforce_controller_match
        merged.check_external_links = config.check_external_links
        merged.require_all_proofs = config.require_all_proofs

    return merged
