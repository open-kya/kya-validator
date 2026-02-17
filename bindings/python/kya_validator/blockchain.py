"""
Blockchain integration API for KYA Validator.

This module provides interfaces for checking blockchain solvency
and verifying on-chain balances.
"""

from typing import Optional
from .types import SolvencyCheck, SolvencyReport
from .errors import BlockchainError


class SolvencyChecker:
    """Blockchain solvency checker.

    This class provides methods for checking on-chain balances
    against minimum thresholds.

    Examples
    --------
    >>> checker = SolvencyChecker()
    >>> check = SolvencyCheck(
    ...     address='0x742d35Cc6634C0532925a3b844Bc9e7595f0bE',
    ...     network='ethereum',
    ...     min_balance='0x0',
    ...     provider='alchemy',
    ... )
    >>> report = checker.verify(check)
    >>> print(report.meets_minimum)
    True
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize solvency checker.

        Parameters
        ----------
        api_key : str, optional
            API key for blockchain provider.
        """
        self.api_key = api_key
        # Placeholder for future PyO3 bindings

    def verify(self, check: SolvencyCheck) -> SolvencyReport:
        """Verify blockchain solvency.

        Parameters
        ----------
        check : SolvencyCheck
            Solvency check configuration.

        Returns
        -------
        SolvencyReport
            Solvency report with results.

        Raises
        ------
        BlockchainError
            If verification fails.

        Examples
        --------
        >>> check = SolvencyCheck(
        ...     address='0x742d35Cc6634C0532925a3b844Bc9e7595f0bE',
        ...     network='ethereum',
        ...     min_balance='0x0',
        ...     provider='alchemy',
        ... )
        >>> report = checker.verify(check)
        >>> print(report.meets_minimum)
        True
        """
        # Placeholder for future PyO3 bindings
        # In production, this will call Rust verify_solvency
        return SolvencyReport(
            address=check.address,
            network=check.network,
            balance='0x0',
            balance_ether=0.0,
            meets_minimum=False,
            minimum_balance=check.min_balance,
            provider=check.provider,
            transaction_count=None,
            last_activity=None,
            errors=['Blockchain verification not yet implemented in Python layer'],
            cached=False,
        )

    def verify_async(
        self,
        check: SolvencyCheck,
    ) -> SolvencyReport:
        """Verify blockchain solvency asynchronously.

        Parameters
        ----------
        check : SolvencyCheck
            Solvency check configuration.

        Returns
        -------
        SolvencyReport
            Solvency report with results.

        Raises
        ------
        BlockchainError
            If verification fails.

        Note
        ----
        This is a placeholder for async support.
        In production, this will use Rust async bindings.
        """
        # Placeholder - call sync version for now
        return self.verify(check)


def verify_solvency(
    address: str,
    network: str = 'ethereum',
    min_balance: str = '0x0',
    provider: str = 'alchemy',
    api_key: Optional[str] = None,
) -> SolvencyReport:
    """Verify blockchain solvency (convenience function).

    This is a convenience function that creates a SolvencyChecker
    and verifies the address.

    Parameters
    ----------
    address : str
        Blockchain address to check.
    network : str, optional
        Blockchain network. Default is 'ethereum'.
    min_balance : str, optional
        Minimum balance in hex wei. Default is '0x0'.
    provider : str, optional
        Blockchain provider. Default is 'alchemy'.
    api_key : str, optional
        API key for blockchain provider.

    Returns
    -------
    SolvencyReport
        Solvency report with results.

    Raises
    ------
        BlockchainError
        If verification fails.

    Examples
    --------
    >>> report = verify_solvency(
    ...     address='0x742d35Cc6634C0532925a3b844Bc9e7595f0bE',
    ...     network='ethereum',
    ...     min_balance='0x0',
    ... )
    >>> print(report.meets_minimum)
    True
    """
    check = SolvencyCheck(
        address=address,
        network=network,
        min_balance=min_balance,
        provider=provider,
    )
    checker = SolvencyChecker(api_key=api_key)
    return checker.verify(check)


def parse_did_pkh(did: str) -> dict[str, str]:
    """Parse did:pkh DID to extract blockchain info.

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
    if not did.startswith('did:pkh:'):
        raise BlockchainError(
            f'Invalid did:pkh format: {did}',
            network=None,
            provider=None,
        )

    parts = did.split(':')
    if len(parts) < 5:
        raise BlockchainError(
            f'Invalid did:pkh format: {did}',
            network=None,
            provider=None,
        )

    try:
        chain_id = int(parts[3])
    except ValueError:
        raise BlockchainError(
            f'Invalid chain ID: {parts[3]}',
            network=None,
            provider=None,
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
