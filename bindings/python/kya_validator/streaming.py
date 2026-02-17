"""
Streaming validation API for KYA Validator.

This module provides interfaces for chunk-based validation
of large manifests to reduce memory usage.
"""

from typing import Optional, Any
from dataclasses import dataclass, field
import json


@dataclass
class ChunkValidationResult:
    """Result of validating a single chunk.

    This dataclass contains the validation results for
    a single chunk of manifest data.

    Attributes
    ----------
    valid : bool
        Whether the chunk is valid.
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

    valid: bool = True
    schema_errors: list[str] = field(default_factory=list)
    ttl_errors: list[str] = field(default_factory=list)
    crypto_errors: list[str] = field(default_factory=list)
    inspector_errors: list[str] = field(default_factory=list)
    policy_errors: list[str] = field(default_factory=list)

    @property
    def total_errors(self) -> int:
        """Get total number of errors.

        Returns
        -------
        int
            Total count of all error messages.
        """
        return (
            len(self.schema_errors) + len(self.ttl_errors) +
            len(self.crypto_errors) + len(self.inspector_errors) +
            len(self.policy_errors)
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary.

        Returns
        -------
        dict
            Dictionary representation of result.
        """
        return {
            'valid': self.valid,
            'schemaErrors': self.schema_errors,
            'ttlErrors': self.ttl_errors,
            'cryptoErrors': self.crypto_errors,
            'inspectorErrors': self.inspector_errors,
            'policyErrors': self.policy_errors,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> 'ChunkValidationResult':
        """Create ChunkValidationResult from dictionary.

        Parameters
        ----------
        data : dict
            Dictionary with result data.

        Returns
        -------
        ChunkValidationResult
            Parsed result instance.
        """
        return cls(
            valid=data.get('valid', True),
            schema_errors=data.get('schemaErrors', []),
            ttl_errors=data.get('ttlErrors', []),
            crypto_errors=data.get('cryptoErrors', []),
            inspector_errors=data.get('inspectorErrors', []),
            policy_errors=data.get('policyErrors', []),
        )


@dataclass
class StreamingValidationState:
    """State of streaming validation process.

    This dataclass tracks the progress of a streaming
    validation operation.

    Attributes
    ----------
    chunks_processed : int
        Number of chunks processed.
    chunks_total : int
        Total number of chunks expected.
    items_processed : int
        Number of items processed.
    items_total : int
        Total number of items expected.
    valid : bool
        Whether validation is valid so far.
    """

    chunks_processed: int = 0
    chunks_total: int = 0
    items_processed: int = 0
    items_total: int = 0
    valid: bool = True

    @property
    def progress_percent(self) -> float:
        """Get progress percentage.

        Returns
        -------
        float
            Progress percentage (0-100).
        """
        if self.chunks_total == 0:
            return 0.0
        return (self.chunks_processed / self.chunks_total) * 100

    def to_dict(self) -> dict[str, Any]:
        """Convert state to dictionary.

        Returns
        -------
        dict
            Dictionary representation of state.
        """
        return {
            'chunksProcessed': self.chunks_processed,
            'chunksTotal': self.chunks_total,
            'itemsProcessed': self.items_processed,
            'itemsTotal': self.items_total,
            'valid': self.valid,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> 'StreamingValidationState':
        """Create StreamingValidationState from dictionary.

        Parameters
        ----------
        data : dict
            Dictionary with state data.

        Returns
        -------
        StreamingValidationState
            Parsed state instance.
        """
        return cls(
            chunks_processed=data.get('chunksProcessed', 0),
            chunks_total=data.get('chunksTotal', 0),
            items_processed=data.get('itemsProcessed', 0),
            items_total=data.get('itemsTotal', 0),
            valid=data.get('valid', True),
        )


class StreamingValidator:
    """Streaming validator for large manifests.

    This class provides chunk-based validation for large manifests,
    reducing memory usage and providing progress reporting.

    Examples
    --------
    >>> validator = StreamingValidator()
    >>> validator.add_chunk('{"kyaVersion": "1.0"}', 1)
    >>> result = validator.finalize()
    >>> print(result.valid)
    True
    """

    def __init__(self):
        """Initialize streaming validator."""
        self.state = StreamingValidationState()
        self.chunk_results = []

    def add_chunk(
        self,
        chunk: str,
        total_chunks: int,
    ) -> ChunkValidationResult:
        """Add a chunk for validation.

        Parameters
        ----------
        chunk : str
            Chunk of manifest JSON to validate.
        total_chunks : int
            Total number of chunks expected.

        Returns
        -------
        ChunkValidationResult
            Validation result for this chunk.

        Examples
        --------
        >>> validator = StreamingValidator()
        >>> result = validator.add_chunk('{"kyaVersion": "1.0"}', 1)
        >>> print(result.valid)
        True
        """
        # Update state
        self.state.chunks_total = total_chunks
        self.state.chunks_processed += 1

        # Validate chunk (placeholder for future PyO3 bindings)
        result = ChunkValidationResult(
            valid=True,
            schema_errors=[],
            ttl_errors=[],
            crypto_errors=[],
            inspector_errors=[],
            policy_errors=[],
        )

        # Update overall validity
        self.state.valid = self.state.valid and result.valid

        # Store result
        self.chunk_results.append(result)

        return result

    def finalize(self) -> dict[str, Any]:
        """Finalize streaming validation and get report.

        Returns
        -------
        dict
            Complete validation report.

        Examples
        --------
        >>> validator = StreamingValidator()
        >>> validator.add_chunk('{"kyaVersion": "1.0"}', 1)
        >>> report = validator.finalize()
        >>> print(report['valid'])
        True
        """
        # Aggregate all chunk results
        all_schema_errors = []
        all_ttl_errors = []
        all_crypto_errors = []
        all_inspector_errors = []
        all_policy_errors = []

        for result in self.chunk_results:
            all_schema_errors.extend(result.schema_errors)
            all_ttl_errors.extend(result.ttl_errors)
            all_crypto_errors.extend(result.crypto_errors)
            all_inspector_errors.extend(result.inspector_errors)
            all_policy_errors.extend(result.policy_errors)

        total_errors = (
            len(all_schema_errors) + len(all_ttl_errors) +
            len(all_crypto_errors) + len(all_inspector_errors) +
            len(all_policy_errors)
        )

        return {
            'valid': total_errors == 0,
            'totalErrors': total_errors,
            'schemaErrors': all_schema_errors,
            'ttlErrors': all_ttl_errors,
            'cryptoErrors': all_crypto_errors,
            'inspectorErrors': all_inspector_errors,
            'policyErrors': all_policy_errors,
            'state': self.state.to_dict(),
        }

    def reset(self) -> None:
        """Reset the validator state.

        This clears all chunks and resets the state.
        """
        self.state = StreamingValidationState()
        self.chunk_results = []

    def get_state(self) -> StreamingValidationState:
        """Get current validation state.

        Returns
        -------
        StreamingValidationState
            Current validation state.
        """
        return self.state


def validate_chunk(
    chunk: str,
    policy_json: str,
) -> ChunkValidationResult:
    """Validate a single manifest chunk (convenience function).

    This is a convenience function for validating a single chunk.

    Parameters
    ----------
    chunk : str
        Chunk of manifest JSON to validate.
    policy_json : str
        Policy JSON string for validation.

    Returns
    -------
        ChunkValidationResult
        Validation result for this chunk.

    Examples
    --------
    >>> result = validate_chunk('{"kyaVersion": "1.0"}', '{}')
    >>> print(result.valid)
    True
    """
    # Placeholder for future PyO3 bindings
    return ChunkValidationResult(
        valid=True,
        schema_errors=[],
        ttl_errors=[],
        crypto_errors=[],
        inspector_errors=[],
        policy_errors=[],
    )
