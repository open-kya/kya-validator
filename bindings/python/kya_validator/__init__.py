"""
Python package shim for the Rust-backed KYA validator.

This module provides the public API for the KYA Validator package.
"""

from .validator import (
    Validator,
    validate_manifest,
    validate_manifest_with_config,
)
from .types import (
    ValidationConfig,
    ValidationReport,
    ValidationMode,
    HashAlgorithm,
    CryptoReport,
    TeeEvidence,
    TeeReport,
    SolvencyCheck,
    SolvencyReport,
    PolicyContext,
)
from .config import (
    load_config,
    save_config,
    create_preset,
    merge_configs,
)
from .policy import (
    PolicyEngine,
    PolicyEvaluationResult,
    evaluate_policy,
    create_policy,
    create_rule,
)
from .tee import (
    TeeVerifier,
    verify_tee_evidence,
)
from .blockchain import (
    SolvencyChecker,
    verify_solvency,
    parse_did_pkh,
)
from .streaming import (
    StreamingValidator,
    ChunkValidationResult,
    StreamingValidationState,
    validate_chunk,
)
from .plugins import (
    PluginManager,
    ValidationPlugin,
    PluginInfo,
    RuleResult,
)
from .inspector import (
    Inspector,
    inspect_manifest,
)
from .resolver import (
    Resolver,
    resolve_key,
    parse_did_pkh,
)
from . import _ffi
from .errors import (
    KyaValidatorError,
    ValidationError,
    InvalidInputError,
    ConfigError,
    TeeVerificationError,
    BlockchainError,
    PluginError,
    CoreError,
)

__version__ = '0.2.0'

__all__ = [
    # Core types
    'ValidationConfig',
    'ValidationReport',
    'ValidationMode',
    'HashAlgorithm',
    'CryptoReport',
    'TeeEvidence',
    'TeeReport',
    'SolvencyCheck',
    'SolvencyReport',
    'PolicyContext',
    # Exceptions
    'KyaValidatorError',
    'ValidationError',
    'InvalidInputError',
    'ConfigError',
    'TeeVerificationError',
    'BlockchainError',
    'PluginError',
    'CoreError',
    # Main validator
    'Validator',
    'validate_manifest',
    'validate_manifest_with_config',
    # Configuration
    'load_config',
    'save_config',
    'create_preset',
    'merge_configs',
    # Policy
    'PolicyEngine',
    'PolicyEvaluationResult',
    'evaluate_policy',
    'create_policy',
    'create_rule',
    # TEE
    'TeeVerifier',
    'verify_tee_evidence',
    # Blockchain
    'SolvencyChecker',
    'verify_solvency',
    'parse_did_pkh',
    # Streaming
    'StreamingValidator',
    'ChunkValidationResult',
    'StreamingValidationState',
    'validate_chunk',
    # Plugins
    'PluginManager',
    'ValidationPlugin',
    'PluginInfo',
    'RuleResult',
    # Inspector
    'Inspector',
    'inspect_manifest',
    # Resolver
    'Resolver',
    'resolve_key',
    # Utilities
    'is_valid_json',
    'format_json',
    'get_version',
    'get_name',
]
