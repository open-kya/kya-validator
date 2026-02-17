"""
Exception hierarchy for KYA Validator.

This module defines all custom exceptions used throughout the KYA Validator
Python package.
"""

from typing import Optional


class KyaValidatorError(Exception):
    """Base exception for all KYA Validator errors.

    All custom exceptions in the KYA Validator package inherit from this
    base class, allowing users to catch all KYA-related errors with a single
    except clause.

    Examples
    --------
    >>> try:
    ...     validate_manifest(manifest_json)
    ... except KyaValidatorError as e:
    ...     print(f"KYA validation failed: {e}")
    """

    def __init__(self, message: str, details: Optional[dict] = None):
        """Initialize exception.

        Parameters
        ----------
        message : str
            Human-readable error message.
        details : dict, optional
            Additional error details for debugging.

        Attributes
        ----------
        message : str
            The error message.
        details : dict
            Additional error details.
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def __str__(self) -> str:
        """Return string representation.

        Returns
        -------
        str
            String representation of the error.
        """
        if self.details:
            return f'{self.message} (details: {self.details})'
        return self.message


class ValidationError(KyaValidatorError):
    """Exception raised when manifest validation fails.

    This exception is raised when the validation process completes but
    produces errors in one or more validation categories (schema, TTL,
    crypto, inspector, or policy).

    Attributes
    ----------
    schema_errors : list[str]
        Schema validation errors.
    ttl_errors : list[str]
        Time-to-live validation errors.
    crypto_errors : list[str]
        Cryptographic verification errors.
    inspector_errors : list[str]
        Inspector validation errors.
    policy_errors : list[str]
        Policy evaluation errors.
    """

    def __init__(
        self,
        message: str,
        schema_errors: Optional[list[str]] = None,
        ttl_errors: Optional[list[str]] = None,
        crypto_errors: Optional[list[str]] = None,
        inspector_errors: Optional[list[str]] = None,
        policy_errors: Optional[list[str]] = None,
    ):
        """Initialize validation error.

        Parameters
        ----------
        message : str
            Human-readable error message.
        schema_errors : list[str], optional
            Schema validation errors.
        ttl_errors : list[str], optional
            Time-to-live validation errors.
        crypto_errors : list[str], optional
            Cryptographic verification errors.
        inspector_errors : list[str], optional
            Inspector validation errors.
        policy_errors : list[str], optional
            Policy evaluation errors.

        Attributes
        ----------
        schema_errors : list[str]
            Schema validation errors.
        ttl_errors : list[str]
            Time-to-live validation errors.
        crypto_errors : list[str]
            Cryptographic verification errors.
        inspector_errors : list[str]
            Inspector validation errors.
        policy_errors : list[str]
            Policy evaluation errors.
        """
        details = {
            'schema_errors': schema_errors or [],
            'ttl_errors': ttl_errors or [],
            'crypto_errors': crypto_errors or [],
            'inspector_errors': inspector_errors or [],
            'policy_errors': policy_errors or [],
        }
        super().__init__(message, details)
        self.schema_errors = details['schema_errors']
        self.ttl_errors = details['ttl_errors']
        self.crypto_errors = details['crypto_errors']
        self.inspector_errors = details['inspector_errors']
        self.policy_errors = details['policy_errors']


class InvalidInputError(KyaValidatorError):
    """Exception raised when input data is invalid.

    This exception is raised when the provided input (manifest JSON,
    configuration, etc.) cannot be parsed or is malformed.

    Examples
    --------
    >>> try:
    ...     validate_manifest("not valid json")
    ... except InvalidInputError as e:
    ...     print(f"Invalid input: {e}")
    """

    pass


class ConfigError(KyaValidatorError):
    """Exception raised when configuration is invalid.

    This exception is raised when the validation configuration is
    malformed, contains invalid values, or cannot be loaded.
    """

    pass


class TeeVerificationError(KyaValidatorError):
    """Exception raised when TEE evidence verification fails.

    This exception is raised when Trusted Execution Environment
    attestation evidence cannot be verified.

    Attributes
    ----------
    tee_type : str, optional
        Type of TEE (e.g., "intel-sgx", "amd-sev-snp").
    """

    def __init__(self, message: str, tee_type: Optional[str] = None):
        """Initialize TEE verification error.

        Parameters
        ----------
        message : str
            Human-readable error message.
        tee_type : str, optional
            Type of TEE that failed verification.

        Attributes
        ----------
        tee_type : str, optional
            Type of TEE that failed verification.
        """
        details = {'tee_type': tee_type} if tee_type else {}
        super().__init__(message, details)
        self.tee_type = tee_type


class BlockchainError(KyaValidatorError):
    """Exception raised during blockchain operations.

    This exception is raised when blockchain queries fail,
    network errors occur, or solvency checks cannot be completed.

    Attributes
    ----------
    network : str, optional
        Blockchain network (e.g., "ethereum", "polygon").
    provider : str, optional
        Blockchain provider (e.g., "alchemy", "infura").
    """

    def __init__(
        self,
        message: str,
        network: Optional[str] = None,
        provider: Optional[str] = None,
    ):
        """Initialize blockchain error.

        Parameters
        ----------
        message : str
            Human-readable error message.
        network : str, optional
            Blockchain network.
        provider : str, optional
            Blockchain provider.

        Attributes
        ----------
        network : str, optional
            Blockchain network.
        provider : str, optional
            Blockchain provider.
        """
        details = {}
        if network:
            details['network'] = network
        if provider:
            details['provider'] = provider
        super().__init__(message, details)
        self.network = network
        self.provider = provider


class PluginError(KyaValidatorError):
    """Exception raised during plugin operations.

    This exception is raised when plugin registration, execution,
    or lifecycle management fails.

    Attributes
    ----------
    plugin_name : str, optional
        Name of the plugin that caused the error.
    """

    def __init__(self, message: str, plugin_name: Optional[str] = None):
        """Initialize plugin error.

        Parameters
        ----------
        message : str
            Human-readable error message.
        plugin_name : str, optional
            Name of the plugin.

        Attributes
        ----------
        plugin_name : str, optional
            Name of the plugin.
        """
        details = {'plugin_name': plugin_name} if plugin_name else {}
        super().__init__(message, details)
        self.plugin_name = plugin_name


class CoreError(KyaValidatorError):
    """Exception raised when an internal core error occurs.

    This exception is raised when an unexpected error occurs in the
    Rust core validation engine that cannot be classified as a more
    specific error type.
    """

    pass
