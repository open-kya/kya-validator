/**
 * KYA Validator TypeScript Definitions
 * Generated for WebAssembly bindings
 */

/**
 * Validation result for WASM
 */
export interface WasmValidationResult {
  /** Whether validation succeeded */
  success: boolean;
  /** Serialized validation report as JSON string */
  report: string;
}

/**
 * Validate a KYA manifest with custom configuration
 * @param manifest_json - Manifest as JSON string
 * @param config_json - Validation configuration as JSON string
 * @returns Validation result
 */
export function validate_manifest(
  manifest_json: string,
  config_json: string
): WasmValidationResult;

/**
 * Validate a KYA manifest with default configuration
 * @param manifest_json - Manifest as JSON string
 * @returns Validation result
 */
export function validate_manifest_default(
  manifest_json: string
): WasmValidationResult;

/**
 * Get default validation configuration
 * @returns Default configuration as JSON string
 */
export function get_default_config(): string;

/**
 * Check if a string is valid JSON
 * @param input - String to check
 * @returns True if valid JSON, false otherwise
 */
export function is_valid_json(input: string): boolean;

/**
 * Format JSON with pretty printing
 * @param input - JSON string to format
 * @returns Pretty-printed JSON string
 */
export function format_json(input: string): string;

/**
 * Get validator version
 * @returns Version string
 */
export function get_version(): string;

/**
 * Get validator name
 * @returns Package name string
 */
export function get_name(): string;

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Validation mode (self-audit or client-audit) */
  mode: ValidationMode;
  /** Allowed KYA versions */
  allowed_kya_versions: string[];
  /** Required fields */
  required_fields: string[];
  /** Enforce controller match */
  enforce_controller_match: boolean;
  /** Check external links */
  check_external_links: boolean;
  /** Link check configurations */
  link_checks: LinkCheckConfig[];
  /** Require all proofs */
  require_all_proofs: boolean;
  /** Required field pairs */
  required_field_pairs: [string, string][];
  /** Allowed controllers */
  allowed_controllers: string[];
  /** Required VC types */
  required_vc_types: string[];
  /** TEE attestation checks */
  attestation_checks: AttestationCheckConfig[];
}

/**
 * Validation mode
 */
export type ValidationMode = "SelfAudit" | "ClientAudit";

/**
 * Link check configuration
 */
export interface LinkCheckConfig {
  /** JSON pointer to URL field */
  json_pointer: string;
  /** Required content in response */
  required_contains?: string;
  /** TLS pinning configuration */
  tls_pin?: TlsPinConfig;
  /** Allowed domains */
  allowed_domains?: string[];
  /** Content check */
  content_check?: ContentCheck;
  /** Digest verification */
  verify_digest?: DigestConfig;
  /** Timeout in seconds */
  timeout_secs?: number;
  /** Max retries */
  max_retries?: number;
  /** Cache TTL in seconds */
  cache_ttl_secs?: number;
}

/**
 * TLS pinning configuration
 */
export interface TlsPinConfig {
  /** Expected certificate hash */
  expected_certificate_hash?: string;
  /** Expected certificate PEM */
  expected_certificate_pem?: string;
}

/**
 * Content check
 */
export interface ContentCheck {
  /** Check type */
  type: ContentCheckType;
  /** Expected value */
  expected_value: string;
  /** JSON pointer to check */
  json_pointer?: string;
}

/**
 * Content check types
 */
export type ContentCheckType =
  | "StringContains"
  | "StringEquals"
  | "StringMatchesRegex"
  | "JsonPointerEquals"
  | "JsonPointerMatchesRegex";

/**
 * Digest configuration
 */
export interface DigestConfig {
  /** Hash algorithm */
  algorithm: HashAlgorithm;
  /** Expected hash */
  expected_hash: string;
}

/**
 * Hash algorithms
 */
export type HashAlgorithm = "Sha256" | "Sha384" | "Sha512";

/**
 * TEE attestation check configuration
 */
export interface AttestationCheckConfig {
  /** JSON pointer to attestation field */
  json_pointer: string;
  /** TEE type */
  tee_type: TEEType;
  /** Require root certificate */
  require_root_certificate: boolean;
  /** Expected TCB info */
  expected_tcb_info?: TcbInfo;
}

/**
 * TEE types
 */
export type TEEType = "SGX" | "Nitro" | "SevSnp";

/**
 * TCB (Trusted Computing Base) info
 */
export interface TcbInfo {
  /** Version */
  version?: string;
  /** Security Version Number */
  svn?: number;
}

/**
 * Validation report
 */
export interface ValidationReport {
  /** Schema validation passed */
  schema_valid: boolean;
  /** Schema validation errors */
  schema_errors: string[];
  /** TTL validation passed */
  ttl_valid: boolean;
  /** TTL validation errors */
  ttl_errors: string[];
  /** Inspector validation passed */
  inspector_valid: boolean;
  /** Inspector validation errors */
  inspector_errors: string[];
  /** Crypto validation passed */
  crypto_valid: boolean;
  /** Crypto validation errors */
  crypto_errors: string[];
  /** Crypto validation report */
  crypto_report?: CryptoReport;
  /** Policy validation passed */
  policy_valid: boolean;
  /** Policy validation errors */
  policy_errors: string[];
}

/**
 * Crypto validation report
 */
export interface CryptoReport {
  /** Resolved keys */
  resolved_keys: string[];
  /** Invalid signatures */
  invalid_signatures: string[];
  /** Missing verification methods */
  missing_verification_methods: string[];
}

/**
 * KYA Manifest
 */
export interface Manifest {
  /** KYA version */
  kya_version: string;
  /** Agent ID (DID) */
  agent_id: string;
  /** Verification methods */
  verification_method?: VerificationMethod[];
  /** Proofs */
  proof: ManifestProof[];
  /** Max transaction value */
  max_transaction_value?: number;
  /** Permitted regions */
  permitted_regions?: string[];
  /** Forbidden regions */
  forbidden_regions?: string[];
}

/**
 * Verification method
 */
export interface VerificationMethod {
  /** Method ID */
  id: string;
  /** Method type */
  type: string;
  /** Controller DID */
  controller: string;
  /** Public key in multibase format */
  public_key_multibase?: string;
}

/**
 * Manifest proof
 */
export interface ManifestProof {
  /** Proof type */
  type: string;
  /** Crypto suite */
  cryptosuite?: string;
  /** Verification method */
  verification_method: string;
  /** Proof purpose */
  proof_purpose: string;
  /** Proof value (signature) */
  proof_value: string;
}

/**
 * Policy context for evaluation
 */
export interface PolicyContext {
  /** Requested region */
  requested_region?: string;
  /** Transaction value */
  transaction_value?: number;
}
