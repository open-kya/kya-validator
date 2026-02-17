"""
Inspector API for KYA Validator.

This module provides interfaces for inspecting KYA manifests.
"""

from typing import Optional, Any
from .errors import KyaValidatorError


class Inspector:
    """Manifest inspector for KYA manifests.

    This class provides methods for inspecting and
    validating manifest structure and content.

    Examples
    --------
    >>> inspector = Inspector()
    >>> info = inspector.inspect(manifest)
    >>> print(info['kyaVersion'])
    1.0
    """

    def __init__(self):
        """Initialize inspector."""
        # Placeholder for future PyO3 bindings
        pass

    def inspect(self, manifest: dict[str, Any]) -> dict[str, Any]:
        """Inspect a KYA manifest.

        Parameters
        ----------
        manifest : dict
            Manifest to inspect.

        Returns
        -------
        dict
            Inspection results with manifest metadata.

        Raises
        ------
        KyaValidatorError
            If inspection fails.

        Examples
        --------
        >>> manifest = {
        ...     'kyaVersion': '1.0',
        ...     'agentId': 'did:key:z6Mk...',
        ... }
        >>> inspector = Inspector()
        >>> info = inspector.inspect(manifest)
        >>> print(info['kyaVersion'])
        1.0
        """
        # Placeholder for future PyO3 bindings
        # In production, this will call Rust inspect_manifest
        return {
            'kyaVersion': manifest.get('kyaVersion'),
            'agentId': manifest.get('agentId'),
            'verificationMethod': manifest.get('verificationMethod'),
            'hasProofs': len(manifest.get('proof', [])) > 0,
            'hasPermittedRegions': bool(manifest.get('permittedRegions')),
            'hasForbiddenRegions': bool(manifest.get('forbiddenRegions')),
            'maxTransactionValue': manifest.get('maxTransactionValue'),
        }

    def validate_version(
        self,
        manifest: dict[str, Any],
        allowed_versions: list[str],
    ) -> bool:
        """Validate KYA version against allowed versions.

        Parameters
        ----------
        manifest : dict
            Manifest to validate.
        allowed_versions : list[str]
            List of allowed version strings.

        Returns
        -------
        bool
            True if version is allowed, False otherwise.

        Examples
        --------
        >>> manifest = {'kyaVersion': '1.0'}
        >>> inspector = Inspector()
        >>> inspector.validate_version(manifest, ['1.0', '1.1'])
        True
        """
        version = manifest.get('kyaVersion')
        if not version:
            return False

        for allowed in allowed_versions:
            if version.startswith(allowed):
                return True

        return False

    def get_verification_methods(
        self,
        manifest: dict[str, Any],
    ) -> list[str]:
        """Get verification methods from manifest.

        Parameters
        ----------
        manifest : dict
            Manifest to extract from.

        Returns
        -------
        list[str]
            List of verification method IDs.
        """
        methods = manifest.get('verificationMethod', [])
        if isinstance(methods, list):
            return methods
        elif isinstance(methods, dict):
            return list(methods.keys())
        return []

    def get_proofs(self, manifest: dict[str, Any]) -> list[dict[str, Any]]:
        """Get proofs from manifest.

        Parameters
        ----------
        manifest : dict
            Manifest to extract from.

        Returns
        -------
        list[dict]
            List of proof objects.
        """
        return manifest.get('proof', [])


def inspect_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    """Inspect a KYA manifest (convenience function).

    This is a convenience function that creates an Inspector
    and inspects a manifest.

    Parameters
    ----------
    manifest : dict
            Manifest to inspect.

    Returns
    -------
    dict
            Inspection results.

    Examples
    --------
    >>> manifest = {
    ...     'kyaVersion': '1.0',
    ...     'agentId': 'did:key:z6Mk...',
    ... }
    >>> info = inspect_manifest(manifest)
    >>> print(info['kyaVersion'])
    1.0
    """
    inspector = Inspector()
    return inspector.inspect(manifest)
