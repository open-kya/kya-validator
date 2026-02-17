"""
TEE (Trusted Execution Environment) verification API.

This module provides interfaces for verifying TEE attestation
evidence from Intel SGX and AMD SEV-SNP.
"""

from typing import Optional
from .types import TeeEvidence, TeeReport
from .errors import TeeVerificationError


class TeeVerifier:
    """TEE attestation evidence verifier.

    This class provides methods for verifying TEE evidence
    from Intel SGX and AMD SEV-SNP.

    Examples
    --------
    >>> verifier = TeeVerifier()
    >>> evidence = TeeEvidence(
    ...     attestation_type='intel-sgx',
    ...     quote='base64encodedquote...'
    ... )
    >>> report = verifier.verify(evidence)
    >>> print(report.valid)
    True
    """

    def __init__(self):
        """Initialize TEE verifier."""
        # Placeholder for future PyO3 bindings
        pass

    def verify(self, evidence: TeeEvidence) -> TeeReport:
        """Verify TEE attestation evidence.

        Parameters
        ----------
        evidence : TeeEvidence
            TEE evidence to verify.

        Returns
        -------
        TeeReport
            Verification report with results.

        Raises
        ------
        TeeVerificationError
            If verification fails.

        Examples
        --------
        >>> evidence = TeeEvidence(
        ...     attestation_type='intel-sgx',
        ...     quote='base64encodedquote...'
        ... )
        >>> report = verifier.verify(evidence)
        """
        # Placeholder for future PyO3 bindings
        # In production, this will call Rust verify_tee_evidence
        return TeeReport(
            valid=False,
            tee_type=evidence.attestation_type,
            mr_enclave='not_implemented',
            mr_signer='not_implemented',
            product_id=0,
            svn=0,
            report_data_match=False,
            errors=['TEE verification not yet implemented in Python layer'],
            info=['Use Rust core for full verification'],
        )

    def verify_sgx(
        self,
        quote: str,
        mr_enclave: Optional[str] = None,
        mr_signer: Optional[str] = None,
        product_id: Optional[int] = None,
        min_svn: Optional[int] = None,
    ) -> TeeReport:
        """Verify Intel SGX attestation quote.

        Parameters
        ----------
        quote : str
            Base64-encoded SGX quote.
        mr_enclave : str, optional
            Expected MR Enclave value.
        mr_signer : str, optional
            Expected MR Signer value.
        product_id : int, optional
            Expected Product ID.
        min_svn : int, optional
            Minimum Security Version Number.

        Returns
        -------
        TeeReport
            Verification report.

        Raises
        ------
        TeeVerificationError
            If verification fails.
        """
        evidence = TeeEvidence(
            attestation_type='intel-sgx',
            quote=quote,
            mr_enclave=mr_enclave,
            mr_signer=mr_signer,
            product_id=product_id,
            min_svn=min_svn,
        )
        return self.verify(evidence)

    def verify_sev_snp(
        self,
        quote: str,
        report_data: Optional[str] = None,
    ) -> TeeReport:
        """Verify AMD SEV-SNP attestation quote.

        Parameters
        ----------
        quote : str
            Base64-encoded SEV-SNP quote.
        report_data : str, optional
            Expected report data.

        Returns
        -------
        TeeReport
            Verification report.

        Raises
        ------
        TeeVerificationError
            If verification fails.
        """
        evidence = TeeEvidence(
            attestation_type='amd-sev-snp',
            quote=quote,
            report_data=report_data,
        )
        return self.verify(evidence)


def verify_tee_evidence(evidence: TeeEvidence) -> TeeReport:
    """Verify TEE attestation evidence (convenience function).

    This is a convenience function that creates a TeeVerifier
    and verifies the evidence.

    Parameters
    ----------
    evidence : TeeEvidence
        TEE evidence to verify.

    Returns
    -------
    TeeReport
        Verification report with results.

    Raises
    ------
    TeeVerificationError
        If verification fails.

    Examples
    --------
    >>> evidence = TeeEvidence(
    ...     attestation_type='intel-sgx',
    ...     quote='base64encodedquote...'
    ... )
    >>> report = verify_tee_evidence(evidence)
    >>> print(report.valid)
    True
    """
    verifier = TeeVerifier()
    return verifier.verify(evidence)
