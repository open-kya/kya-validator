"""
Resolver API for KYA Validator.

This module provides interfaces for resolving DIDs and
verification methods.
"""

from typing import Optional, Any
from .errors import KyaValidatorError


class Resolver:
    """DID and verification method resolver.

    This class provides methods for resolving DIDs and
    extracting verification methods.

    Examples
    --------
    >>> resolver = Resolver()
    >>> key = resolver.resolve_key('did:key:z6Mk...')
    >>> print(key['id'])
    did:key:z6Mk...#key-1
    """

    def __init__(self):
        """Initialize resolver."""
        # Placeholder for future PyO3 bindings
        pass

    def resolve_key(
        self,
        method_id: str,
        manifest: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Resolve a verification method to a public key.

        Parameters
        ----------
        method_id : str
            Verification method ID or DID to resolve.
        manifest : dict, optional
            Manifest containing inline verification methods.

        Returns
        -------
        dict
            Resolved key information with id, controller,
            key_type, and public_key.

        Raises
        ------
        KyaValidatorError
            If resolution fails.

        Examples
        --------
        >>> resolver = Resolver()
        >>> key = resolver.resolve_key('did:key:z6Mk...')
        >>> print(key['id'])
        did:key:z6Mk...#key-1
        """
        # Placeholder for future PyO3 bindings
        # In production, this will call Rust resolve_key_for_method
        return {
            'id': method_id,
            'controller': 'did:key:placeholder',
            'key_type': 'Ed25519',
            'public_key': 'placeholder',
        }

    def resolve_did_key(self, did: str) -> dict[str, Any]:
        """Resolve a did:key DID to extract the public key.

        Parameters
        ----------
        did : str
            DID:key string to resolve.

        Returns
        -------
        dict
            Resolved key information.

        Raises
        ------
        KyaValidatorError
            If DID is invalid or resolution fails.

        Examples
        --------
        >>> resolver = Resolver()
        >>> key = resolver.resolve_did_key('did:key:z6Mk...')
        >>> print(key['key_type'])
        Ed25519
        """
        if not did.startswith('did:key:'):
            raise KyaValidatorError(
                f'Invalid did:key format: {did}'
            )

        # Placeholder for future PyO3 bindings
        # In production, this will call Rust resolve_did_key
        return {
            'id': did,
            'controller': did,
            'key_type': 'Ed25519',
            'public_key': 'placeholder',
        }

    def resolve_did_web(self, did: str) -> dict[str, Any]:
        """Resolve a did:web DID to get verification methods.

        Parameters
        ----------
        did : str
            DID:web string to resolve.

        Returns
        -------
        dict
            DID document with verification methods.

        Raises
        ------
        KyaValidatorError
            If DID is invalid or resolution fails.

        Examples
        --------
        >>> resolver = Resolver()
        >>> doc = resolver.resolve_did_web('did:web:example.com')
        >>> print('verificationMethod' in doc)
        True
        """
        if not did.startswith('did:web:'):
            raise KyaValidatorError(
                f'Invalid did:web format: {did}'
            )

        # Placeholder for future PyO3 bindings
        # In production, this will call Rust resolve_did_web
        return {
            'id': did,
            'verificationMethod': [],
        }

    def parse_did_pkh(self, did: str) -> dict[str, str]:
        """Parse did:pkh DID to extract blockchain info.

        Parameters
        ----------
        did : str
            DID:pkh string to parse.

        Returns
        -------
        dict
            Dictionary with network, address, and chain_id.

        Raises
        ------
        KyaValidatorError
            If DID is invalid.

        Examples
        --------
        >>> resolver = Resolver()
        >>> info = resolver.parse_did_pkh(
        ...     'did:pkh:eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bE'
        ... )
        >>> print(info['network'])
        ethereum
        """
        if not did.startswith('did:pkh:'):
            raise KyaValidatorError(
                f'Invalid did:pkh format: {did}'
            )

        parts = did.split(':')
        if len(parts) < 5:
            raise KyaValidatorError(
                f'Invalid did:pkh format: {did}'
            )

        try:
            chain_id = int(parts[3])
        except ValueError:
            raise KyaValidatorError(
                f'Invalid chain ID: {parts[3]}'
            )

        address = parts[4].lower()

        # Map chain ID to network name
        network_map = {
            1: 'ethereum',
            137: 'polygon',
            56: 'bsc',
            42161: 'arbitrum',
            10: 'optimism',
            43114: 'avalanche',
        }

        network_name = network_map.get(chain_id, f'chain-{chain_id}')

        return {
            'network': network_name,
            'address': address,
            'chain_id': chain_id,
        }


def resolve_key(method_id: str, manifest: Optional[dict] = None) -> dict[str, Any]:
    """Resolve a verification method (convenience function).

    This is a convenience function that creates a Resolver
    and resolves the verification method.

    Parameters
    ----------
    method_id : str
        Verification method ID or DID to resolve.
    manifest : dict, optional
        Manifest containing inline verification methods.

    Returns
    -------
    dict
        Resolved key information.

    Examples
    --------
    >>> key = resolve_key('did:key:z6Mk...')
    >>> print(key['id'])
    did:key:z6Mk...#key-1
    """
    resolver = Resolver()
    return resolver.resolve_key(method_id, manifest)


def parse_did_pkh(did: str) -> dict[str, str]:
    """Parse did:pkh DID (convenience function).

    This is a convenience function that creates a Resolver
    and parses the DID.

    Parameters
    ----------
    did : str
        DID:pkh string to parse.

    Returns
    -------
    dict
        Dictionary with network, address, and chain_id.

    Examples
    --------
    >>> info = parse_did_pkh(
    ...     'did:pkh:eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bE'
    ... )
    >>> print(info['network'])
    ethereum
    """
    resolver = Resolver()
    return resolver.parse_did_pkh(did)
