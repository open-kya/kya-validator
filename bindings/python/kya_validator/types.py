"""
Python types and dataclasses for KYA Validator.

This module defines Python types that mirror the Rust types defined in
src/types.rs, providing type-safe interfaces for manifest validation.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Union, Any
import json


# Type aliases
JsonDict = dict[str, Any]
JsonValue = Union[str, int, float, bool, list[Any], JsonDict]
ManifestDict = JsonDict
PolicyContextDict = JsonDict


class ValidationMode(Enum):
    """Validation mode for manifest validation.

    Attributes
    ----------
    SELF_AUDIT : ValidationMode
        Self-audit mode, used for validating own manifests.
    CLIENT_AUDIT : ValidationMode
        Client-audit mode, used for validating manifests from
        external sources.
    """

    SELF_AUDIT = 'selfAudit'
    CLIENT_AUDIT = 'clientAudit'

    @classmethod
    def from_rust_value(cls, value: str) -> 'ValidationMode':
        """Convert Rust enum value to Python enum.

        Parameters
        ----------
        value : str
            Rust enum value ('selfAudit' or 'clientAudit').

        Returns
        -------
        ValidationMode
            Corresponding Python enum value.

        Raises
        ------
        ValueError
            If value is not a valid validation mode.
        """
        if value == 'selfAudit':
            return cls.SELF_AUDIT
        if value == 'clientAudit':
            return cls.CLIENT_AUDIT
        raise ValueError(f'Invalid validation mode: {value}')

    def to_rust_value(self) -> str:
        """Convert Python enum to Rust enum value.

        Returns
        -------
        str
            Rust enum value.
        """
        return self.value


class HashAlgorithm(Enum):
    """Hash algorithm for digest computation.

    Attributes
    ----------
    SHA256 : HashAlgorithm
        SHA-256 hash algorithm.
    SHA384 : HashAlgorithm
        SHA-384 hash algorithm.
    SHA512 : HashAlgorithm
        SHA-512 hash algorithm.
    """

    SHA256 = 'sha256'
    SHA384 = 'sha384'
    SHA512 = 'sha512'

    @classmethod
    def from_rust_value(cls, value: str) -> 'HashAlgorithm':
        """Convert Rust enum value to Python enum.

        Parameters
        ----------
        value : str
            Rust enum value ('sha256', 'sha384', or 'sha512').

        Returns
        -------
        HashAlgorithm
            Corresponding Python enum value.

        Raises
        ------
        ValueError
            If value is not a valid hash algorithm.
        """
        for algo in cls:
            if algo.value == value:
                return algo
        raise ValueError(f'Invalid hash algorithm: {value}')

    def to_rust_value(self) -> str:
        """Convert Python enum to Rust enum value.

        Returns
        -------
        str
            Rust enum value.
        """
        return self.value


@dataclass
class CryptoReport:
    """Cryptographic verification report.

    This dataclass contains information about resolved keys,
    invalid signatures, and missing verification methods.

    Attributes
    ----------
    resolved_keys : list[str]
        List of resolved verification keys.
    invalid_signatures : list[str]
        List of invalid signature references.
    missing_verification_methods : list[str]
        List of missing verification method references.
    """

    resolved_keys: list[str] = field(default_factory=list)
    invalid_signatures: list[str] = field(default_factory=list)
    missing_verification_methods: list[str] = field(default_factory=list)

    @classmethod
    def from_json(cls, json_str: str) -> 'CryptoReport':
        """Create CryptoReport from JSON string.

        Parameters
        ----------
        json_str : str
            JSON string representation of CryptoReport.

        Returns
        -------
        CryptoReport
            Parsed CryptoReport instance.
        """
        data = json.loads(json_str)
        return cls(
            resolved_keys=data.get('resolvedKeys', []),
            invalid_signatures=data.get('invalidSignatures', []),
            missing_verification_methods=data.get(
                'missingVerificationMethods', []
            ),
        )

    def to_json(self) -> str:
        """Convert CryptoReport to JSON string.

        Returns
        -------
        str
            JSON string representation.
        """
        return json.dumps({
            'resolvedKeys': self.resolved_keys,
            'invalidSignatures': self.invalid_signatures,
            'missingVerificationMethods': self.missing_verification_methods,
        })


@dataclass
class ValidationReport:
    """Validation report for a KYA manifest.

    This dataclass contains the results of all validation checks
    performed on a manifest.

    Attributes
    ----------
    schema_valid : bool
        Whether schema validation passed.
    schema_errors : list[str]
        Schema validation error messages.
    ttl_valid : bool
        Whether time-to-live validation passed.
    ttl_errors : list[str]
        Time-to-live validation error messages.
    inspector_valid : bool
        Whether inspector validation passed.
    inspector_errors : list[str]
        Inspector validation error messages.
    crypto_valid : bool
        Whether cryptographic verification passed.
    crypto_errors : list[str]
        Cryptographic verification error messages.
    crypto_report : Optional[CryptoReport]
        Detailed cryptographic verification report.
    policy_valid : bool
        Whether policy evaluation passed.
    policy_errors : list[str]
        Policy evaluation error messages.
    """

    schema_valid: bool = True
    schema_errors: list[str] = field(default_factory=list)
    ttl_valid: bool = True
    ttl_errors: list[str] = field(default_factory=list)
    inspector_valid: bool = True
    inspector_errors: list[str] = field(default_factory=list)
    crypto_valid: bool = True
    crypto_errors: list[str] = field(default_factory=list)
    crypto_report: Optional[CryptoReport] = None
    policy_valid: bool = True
    policy_errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """Check if overall validation passed.

        Returns
        -------
        bool
            True if all validation categories passed.
        """
        return (
            self.schema_valid and self.ttl_valid and
            self.inspector_valid and self.crypto_valid and
            self.policy_valid
        )

    @property
    def total_errors(self) -> int:
        """Get total number of validation errors.

        Returns
        -------
        int
            Total count of all error messages.
        """
        return (
            len(self.schema_errors) + len(self.ttl_errors) +
            len(self.inspector_errors) + len(self.crypto_errors) +
            len(self.policy_errors)
        )

    @classmethod
    def from_json(cls, json_str: str) -> 'ValidationReport':
        """Create ValidationReport from JSON string.

        Parameters
        ----------
        json_str : str
            JSON string representation of ValidationReport.

        Returns
        -------
        ValidationReport
            Parsed ValidationReport instance.
        """
        data = json.loads(json_str)
        crypto_report = None
        if data.get('cryptoReport'):
            crypto_report = CryptoReport.from_json(
                json.dumps(data['cryptoReport'])
            )
        return cls(
            schema_valid=data.get('schemaValid', True),
            schema_errors=data.get('schemaErrors', []),
            ttl_valid=data.get('ttlValid', True),
            ttl_errors=data.get('ttlErrors', []),
            inspector_valid=data.get('inspectorValid', True),
            inspector_errors=data.get('inspectorErrors', []),
            crypto_valid=data.get('cryptoValid', True),
            crypto_errors=data.get('cryptoErrors', []),
            crypto_report=crypto_report,
            policy_valid=data.get('policyValid', True),
            policy_errors=data.get('policyErrors', []),
        )

    def to_json(self) -> str:
        """Convert ValidationReport to JSON string.

        Returns
        -------
        str
            JSON string representation.
        """
        result = {
            'schemaValid': self.schema_valid,
            'schemaErrors': self.schema_errors,
            'ttlValid': self.ttl_valid,
            'ttlErrors': self.ttl_errors,
            'inspectorValid': self.inspector_valid,
            'inspectorErrors': self.inspector_errors,
            'cryptoValid': self.crypto_valid,
            'cryptoErrors': self.crypto_errors,
            'policyValid': self.policy_valid,
            'policyErrors': self.policy_errors,
        }
        if self.crypto_report:
            result['cryptoReport'] = json.loads(self.crypto_report.to_json())
        return json.dumps(result)

    def __str__(self) -> str:
        """Return string representation.

        Returns
        -------
        str
            Human-readable summary of validation results.
        """
        status = 'VALID' if self.is_valid else 'INVALID'
        return f'ValidationReport({status}, {self.total_errors} errors)'


@dataclass
class ValidationConfig:
    """Configuration for manifest validation.

    This dataclass mirrors the Rust ValidationConfig struct and
    controls which validation checks are performed.

    Attributes
    ----------
    mode : ValidationMode
        Validation mode (selfAudit or clientAudit).
    allowed_kya_versions : list[str]
        List of allowed KYA version strings.
    required_fields : list[str]
        List of required JSON pointers (e.g., '/agentId').
    enforce_controller_match : bool
        Whether to enforce controller matching.
    check_external_links : bool
        Whether to check external links.
    require_all_proofs : bool
        Whether to require all proofs to be present.
    required_field_pairs : list[tuple[str, str]]
        List of field pairs that must both be present.
    allowed_controllers : list[str]
        List of allowed controller DIDs.
    required_vc_types : list[str]
        List of required verifiable credential types.
    """

    mode: ValidationMode = ValidationMode.SELF_AUDIT
    allowed_kya_versions: list[str] = field(
        default_factory=lambda: ['1.0', '1.1']
    )
    required_fields: list[str] = field(default_factory=list)
    enforce_controller_match: bool = True
    check_external_links: bool = False
    require_all_proofs: bool = False
    required_field_pairs: list[tuple[str, str]] = field(default_factory=list)
    allowed_controllers: list[str] = field(default_factory=list)
    required_vc_types: list[str] = field(default_factory=list)

    @classmethod
    def self_audit(cls) -> 'ValidationConfig':
        """Create self-audit configuration preset.

        Returns
        -------
        ValidationConfig
            Self-audit configuration preset.
        """
        return cls(
            mode=ValidationMode.SELF_AUDIT,
            allowed_kya_versions=['1.0', '1.1'],
            required_fields=['/agentId', '/proof'],
            enforce_controller_match=True,
            check_external_links=True,
            require_all_proofs=True,
        )

    @classmethod
    def client_audit(cls) -> 'ValidationConfig':
        """Create client-audit configuration preset.

        Returns
        -------
        ValidationConfig
            Client-audit configuration preset.
        """
        return cls(
            mode=ValidationMode.CLIENT_AUDIT,
            allowed_kya_versions=['1.0', '1.1'],
            required_fields=['/agentId', '/proof'],
            enforce_controller_match=True,
            check_external_links=False,
            require_all_proofs=True,
        )

    @classmethod
    def default(cls) -> 'ValidationConfig':
        """Create default configuration.

        Returns
        -------
        ValidationConfig
            Default configuration instance.
        """
        return cls()

    def to_json(self) -> str:
        """Convert ValidationConfig to JSON string.

        Returns
        -------
        str
            JSON string representation.
        """
        return json.dumps({
            'mode': self.mode.to_rust_value(),
            'allowedKyaVersions': self.allowed_kya_versions,
            'requiredFields': self.required_fields,
            'enforceControllerMatch': self.enforce_controller_match,
            'checkExternalLinks': self.check_external_links,
            'requireAllProofs': self.require_all_proofs,
            'requiredFieldPairs': self.required_field_pairs,
            'allowedControllers': self.allowed_controllers,
            'requiredVcTypes': self.required_vc_types,
        })

    @classmethod
    def from_json(cls, json_str: str) -> 'ValidationConfig':
        """Create ValidationConfig from JSON string.

        Parameters
        ----------
        json_str : str
            JSON string representation of ValidationConfig.

        Returns
        -------
        ValidationConfig
            Parsed ValidationConfig instance.
        """
        data = json.loads(json_str)
        mode = ValidationMode.from_rust_value(data.get('mode', 'selfAudit'))
        return cls(
            mode=mode,
            allowed_kya_versions=data.get('allowedKyaVersions', ['1.0', '1.1']),
            required_fields=data.get('requiredFields', []),
            enforce_controller_match=data.get('enforceControllerMatch', True),
            check_external_links=data.get('checkExternalLinks', False),
            require_all_proofs=data.get('requireAllProofs', False),
            required_field_pairs=[
                tuple(pair) for pair in data.get('requiredFieldPairs', [])
            ],
            allowed_controllers=data.get('allowedControllers', []),
            required_vc_types=data.get('requiredVcTypes', []),
        )


@dataclass
class TeeEvidence:
    """TEE evidence for attestation verification.

    This dataclass contains the evidence submitted for
    Trusted Execution Environment attestation.

    Attributes
    ----------
    attestation_type : str
        Type of TEE attestation ('intel-sgx' or 'amd-sev-snp').
    quote : str
        Base64-encoded attestation quote.
    certificates : Optional[str]
        Optional certificate chain for quote verification.
    report_data : Optional[str]
        Expected report data in hex format.
    mr_enclave : Optional[str]
        Expected MR Enclave value in hex.
    mr_signer : Optional[str]
        Expected MR Signer value in hex.
    product_id : Optional[int]
        Expected Product ID.
    min_svn : Optional[int]
        Minimum Security Version Number.
    """

    attestation_type: str
    quote: str
    certificates: Optional[str] = None
    report_data: Optional[str] = None
    mr_enclave: Optional[str] = None
    mr_signer: Optional[str] = None
    product_id: Optional[int] = None
    min_svn: Optional[int] = None

    def to_json(self) -> str:
        """Convert TeeEvidence to JSON string.

        Returns
        -------
        str
            JSON string representation.
        """
        data = {
            'attestationType': self.attestation_type,
            'quote': self.quote,
        }
        if self.certificates:
            data['certificates'] = self.certificates
        if self.report_data:
            data['reportData'] = self.report_data
        if self.mr_enclave:
            data['mrEnclave'] = self.mr_enclave
        if self.mr_signer:
            data['mrSigner'] = self.mr_signer
        if self.product_id is not None:
            data['productId'] = self.product_id
        if self.min_svn is not None:
            data['minSvn'] = self.min_svn
        return json.dumps(data)

    @classmethod
    def from_json(cls, json_str: str) -> 'TeeEvidence':
        """Create TeeEvidence from JSON string.

        Parameters
        ----------
        json_str : str
            JSON string representation of TeeEvidence.

        Returns
        -------
        TeeEvidence
            Parsed TeeEvidence instance.
        """
        data = json.loads(json_str)
        return cls(
            attestation_type=data['attestationType'],
            quote=data['quote'],
            certificates=data.get('certificates'),
            report_data=data.get('reportData'),
            mr_enclave=data.get('mrEnclave'),
            mr_signer=data.get('mrSigner'),
            product_id=data.get('productId'),
            min_svn=data.get('minSvn'),
        )


@dataclass
class TeeReport:
    """TEE attestation verification report.

    This dataclass contains the results of TEE evidence verification.

    Attributes
    ----------
    valid : bool
        Whether the evidence is valid.
    tee_type : str
        Type of TEE that was verified.
    mr_enclave : str
        MRENCLAVE value from quote.
    mr_signer : str
        MRSIGNER value from quote.
    product_id : int
        Product ID from quote.
    svn : int
        Security Version Number from quote.
    report_data_match : bool
        Whether report data matched expected value.
    errors : list[str]
        Verification error messages.
    info : list[str]
        Additional information messages.
    """

    valid: bool
    tee_type: str
    mr_enclave: str
    mr_signer: str
    product_id: int
    svn: int
    report_data_match: bool
    errors: list[str] = field(default_factory=list)
    info: list[str] = field(default_factory=list)

    @classmethod
    def from_json(cls, json_str: str) -> 'TeeReport':
        """Create TeeReport from JSON string.

        Parameters
        ----------
        json_str : str
            JSON string representation of TeeReport.

        Returns
        -------
        TeeReport
            Parsed TeeReport instance.
        """
        data = json.loads(json_str)
        return cls(
            valid=data['valid'],
            tee_type=data['teeType'],
            mr_enclave=data['mrEnclave'],
            mr_signer=data['mrSigner'],
            product_id=data['productId'],
            svn=data['svn'],
            report_data_match=data['reportDataMatch'],
            errors=data.get('errors', []),
            info=data.get('info', []),
        )

    def to_json(self) -> str:
        """Convert TeeReport to JSON string.

        Returns
        -------
        str
            JSON string representation.
        """
        return json.dumps({
            'valid': self.valid,
            'teeType': self.tee_type,
            'mrEnclave': self.mr_enclave,
            'mrSigner': self.mr_signer,
            'productId': self.product_id,
            'svn': self.svn,
            'reportDataMatch': self.report_data_match,
            'errors': self.errors,
            'info': self.info,
        })


@dataclass
class SolvencyCheck:
    """Configuration for blockchain solvency check.

    This dataclass contains the parameters for checking
    on-chain balance against a minimum threshold.

    Attributes
    ----------
    address : str
        Blockchain address to check.
    network : str
        Blockchain network ('ethereum', 'polygon', etc.).
    min_balance : str
        Minimum required balance in wei (hex format).
    provider : str
        Blockchain provider ('alchemy', 'infura', etc.).
    check_transactions : bool
        Whether to check transaction count.
    transaction_window_days : Optional[int]
        Number of days to look back for transactions.
    """

    address: str
    network: str
    min_balance: str
    provider: str
    check_transactions: bool = False
    transaction_window_days: Optional[int] = None

    def to_json(self) -> str:
        """Convert SolvencyCheck to JSON string.

        Returns
        -------
        str
            JSON string representation.
        """
        data = {
            'address': self.address,
            'network': self.network,
            'minBalance': self.min_balance,
            'provider': self.provider,
            'checkTransactions': self.check_transactions,
        }
        if self.transaction_window_days is not None:
            data['transactionWindowDays'] = self.transaction_window_days
        return json.dumps(data)


@dataclass
class SolvencyReport:
    """Blockchain solvency check report.

    This dataclass contains the results of a solvency check.

    Attributes
    ----------
    address : str
        Blockchain address that was checked.
    network : str
        Blockchain network.
    balance : str
        Current balance in hex wei format.
    balance_ether : float
        Current balance in ETH.
    meets_minimum : bool
        Whether balance meets minimum requirement.
    minimum_balance : str
        Required minimum balance in hex wei format.
    provider : str
        Blockchain provider used.
    transaction_count : Optional[int]
        Number of transactions (if checked).
    last_activity : Optional[int]
        Last activity timestamp.
    errors : list[str]
        Error messages.
    cached : bool
        Whether result was from cache.
    """

    address: str
    network: str
    balance: str
    balance_ether: float
    meets_minimum: bool
    minimum_balance: str
    provider: str
    transaction_count: Optional[int] = None
    last_activity: Optional[int] = None
    errors: list[str] = field(default_factory=list)
    cached: bool = False

    @classmethod
    def from_json(cls, json_str: str) -> 'SolvencyReport':
        """Create SolvencyReport from JSON string.

        Parameters
        ----------
        json_str : str
            JSON string representation of SolvencyReport.

        Returns
        -------
        SolvencyReport
            Parsed SolvencyReport instance.
        """
        data = json.loads(json_str)
        return cls(
            address=data['address'],
            network=data['network'],
            balance=data['balance'],
            balance_ether=data['balanceEther'],
            meets_minimum=data['meetsMinimum'],
            minimum_balance=data['minimumBalance'],
            provider=data['provider'],
            transaction_count=data.get('transactionCount'),
            last_activity=data.get('lastActivity'),
            errors=data.get('errors', []),
            cached=data.get('cached', False),
        )

    def to_json(self) -> str:
        """Convert SolvencyReport to JSON string.

        Returns
        -------
        str
            JSON string representation.
        """
        data = {
            'address': self.address,
            'network': self.network,
            'balance': self.balance,
            'balanceEther': self.balance_ether,
            'meetsMinimum': self.meets_minimum,
            'minimumBalance': self.minimum_balance,
            'provider': self.provider,
            'errors': self.errors,
            'cached': self.cached,
        }
        if self.transaction_count is not None:
            data['transactionCount'] = self.transaction_count
        if self.last_activity is not None:
            data['lastActivity'] = self.last_activity
        return json.dumps(data)


@dataclass
class PolicyContext:
    """Context for policy evaluation.

    This dataclass provides runtime context for policy rules
    during evaluation.

    Attributes
    ----------
    requested_region : Optional[str]
        Region requested for transaction.
    transaction_value : Optional[int]
        Value of transaction being validated.
    """

    requested_region: Optional[str] = None
    transaction_value: Optional[int] = None

    def to_json(self) -> str:
        """Convert PolicyContext to JSON string.

        Returns
        -------
        str
            JSON string representation.
        """
        data = {}
        if self.requested_region:
            data['requestedRegion'] = self.requested_region
        if self.transaction_value is not None:
            data['transactionValue'] = self.transaction_value
        return json.dumps(data)

    @classmethod
    def from_json(cls, json_str: str) -> 'PolicyContext':
        """Create PolicyContext from JSON string.

        Parameters
        ----------
        json_str : str
            JSON string representation of PolicyContext.

        Returns
        -------
        PolicyContext
            Parsed PolicyContext instance.
        """
        data = json.loads(json_str)
        return cls(
            requested_region=data.get('requestedRegion'),
            transaction_value=data.get('transactionValue'),
        )
