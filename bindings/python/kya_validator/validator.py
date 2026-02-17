"""
High-level Validator API for KYA Validator.

This module provides the main Validator class that orchestrates
manifest validation with configuration management.
"""

from typing import Optional, Union
from contextlib import contextmanager
from .types import ValidationConfig, ValidationReport
from .config import load_config
from . import _ffi
from .errors import KyaValidatorError, InvalidInputError


class Validator:
    """High-level validator for KYA manifests.

    This class provides a Pythonic API for validating KYA manifests,
    with support for configuration management and resource cleanup.

    Examples
    --------
    >>> validator = Validator()
    >>> report = validator.validate(manifest_json)
    >>> print(report.is_valid)
    True
    """

    def __init__(
        self,
        config: Optional[ValidationConfig] = None,
        config_source: Optional[Union[str, dict]] = None,
    ):
        """Initialize Validator.

        Parameters
        ----------
        config : ValidationConfig, optional
            Validation configuration. If not provided, uses default.
        config_source : str or dict, optional
            Configuration source (file path or dict). Overrides config.
        """
        if config_source is not None:
            self.config = load_config(config_source)
        elif config is not None:
            self.config = config
        else:
            self.config = ValidationConfig.default()

    def validate(
        self,
        manifest_json: str,
    ) -> ValidationReport:
        """Validate a KYA manifest.

        Parameters
        ----------
        manifest_json : str
            Manifest JSON string to validate.

        Returns
        -------
        ValidationReport
            Validation report with results.

        Raises
        ------
        InvalidInputError
            If manifest JSON is invalid.
        KyaValidatorError
            If validation fails.
        """
        # Validate JSON first
        if not _ffi.is_valid_json(manifest_json):
            raise InvalidInputError('Invalid manifest JSON')

        # Call Rust core with configuration
        config_json = self.config.to_json()
        report_json = _ffi.validate_manifest_json_with_config(
            manifest_json,
            config_json,
        )

        # Parse report
        return ValidationReport.from_json(report_json)

    def validate_with_config(
        self,
        manifest_json: str,
        config: ValidationConfig,
    ) -> ValidationReport:
        """Validate a manifest with custom configuration.

        Parameters
        ----------
        manifest_json : str
            Manifest JSON string to validate.
        config : ValidationConfig
            Custom validation configuration.

        Returns
        -------
        ValidationReport
            Validation report with results.

        Raises
        ------
        InvalidInputError
            If manifest or config JSON is invalid.
        KyaValidatorError
            If validation fails.
        """
        # Validate JSON first
        if not _ffi.is_valid_json(manifest_json):
            raise InvalidInputError('Invalid manifest JSON')

        # Call Rust core
        config_json = config.to_json()
        report_json = _ffi.validate_manifest_json_with_config(
            manifest_json,
            config_json,
        )

        # Parse report
        return ValidationReport.from_json(report_json)

    def update_config(self, config: ValidationConfig) -> None:
        """Update validator configuration.

        Parameters
        ----------
        config : ValidationConfig
            New configuration to use.
        """
        self.config = config

    @classmethod
    def create(cls, mode: str = 'self_audit') -> 'Validator':
        """Create a validator with preset configuration.

        Parameters
        ----------
        mode : str, optional
            Preset mode: 'self_audit' or 'client_audit'.
            Default is 'self_audit'.

        Returns
        -------
        Validator
            Configured validator instance.
        """
        from .config import create_preset
        return cls(config=create_preset(mode))

    @contextmanager
    def _resource_context(self):
        """Context manager for resource management.

        Currently a placeholder for future resource cleanup.
        """
        yield

    def __enter__(self):
        """Enter context manager.

        Returns
        -------
        Validator
            Self for use in with statements.
        """
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager.

        Parameters
        ----------
        exc_type : type
            Exception type if raised.
        exc_val : Exception
            Exception value if raised.
        exc_tb : traceback
            Exception traceback if raised.
        """
        # Placeholder for future cleanup
        pass


def validate_manifest(
    manifest_json: str,
    config: Optional[ValidationConfig] = None,
) -> ValidationReport:
    """Validate a KYA manifest (convenience function).

    This is a convenience function that creates a Validator
    instance and validates the manifest.

    Parameters
    ----------
    manifest_json : str
        Manifest JSON string to validate.
    config : ValidationConfig, optional
        Validation configuration. If not provided, uses default.

    Returns
    -------
    ValidationReport
        Validation report with results.

    Raises
    ------
    InvalidInputError
        If manifest JSON is invalid.
    KyaValidatorError
        If validation fails.

    Examples
    --------
    >>> report = validate_manifest(manifest_json)
    >>> print(report.is_valid)
    True
    """
    validator = Validator(config=config)
    return validator.validate(manifest_json)


def validate_manifest_with_config(
    manifest_json: str,
    config_json: str,
) -> ValidationReport:
    """Validate a manifest with JSON configuration.

    Parameters
    ----------
    manifest_json : str
        Manifest JSON string to validate.
    config_json : str
        Configuration JSON string.

    Returns
    -------
    ValidationReport
        Validation report with results.

    Raises
    ------
    InvalidInputError
        If manifest or config JSON is invalid.
    KyaValidatorError
        If validation fails.
    """
    # Validate JSON first
    if not _ffi.is_valid_json(manifest_json):
        raise InvalidInputError('Invalid manifest JSON')
    if not _ffi.is_valid_json(config_json):
        raise InvalidInputError('Invalid configuration JSON')

    # Call Rust core
    report_json = _ffi.validate_manifest_json_with_config(
        manifest_json,
        config_json,
    )

    # Parse report
    return ValidationReport.from_json(report_json)
