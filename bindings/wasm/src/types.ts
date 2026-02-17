// bindings/wasm/src/types.ts
// TypeScript type definitions for KYA Validator WASM bindings

/**
 * Validation result returned from WASM
 */
export interface WasmValidationResult {
  /** Whether all validation checks passed */
  success: boolean;
  /** Serialized validation report as JSON string */
  report: string;
}

/**
 * Parsed validation report
 */
export interface ValidationReport {
  schema_valid: boolean;
  schema_errors: string[];
  ttl_valid: boolean;
  ttl_errors: string[];
  inspector_valid: boolean;
  inspector_errors: string[];
  crypto_valid: boolean;
  crypto_errors: string[];
  policy_valid: boolean;
  policy_errors: string[];
}

/**
 * Validation mode
 */
export type ValidationMode = "SelfAudit" | "ClientAudit";

/**
 * Link check configuration
 */
export interface LinkCheckConfig {
  /** JSON pointer to the field containing the URL */
  json_pointer: string;
  /** Required substring in the response */
  required_contains?: string;
  /** Timeout in seconds */
  timeout_secs?: number;
  /** Maximum retry attempts */
  max_retries?: number;
}

/**
 * TEE attestation check configuration
 */
export interface AttestationCheckConfig {
  /** JSON pointer to the attestation quote field */
  json_pointer: string;
  /** TEE type */
  tee_type: "SGX" | "SEV" | "TDX";
  /** Require root certificate verification */
  require_root_certificate?: boolean;
  /** Expected TCB info */
  expected_tcb_info?: {
    version?: string;
    svn?: number;
  };
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Validation mode */
  mode: ValidationMode;
  /** Allowed KYA manifest versions */
  allowed_kya_versions: string[];
  /** Required JSON pointer fields */
  required_fields: string[];
  /** Enforce that controller matches agent identity */
  enforce_controller_match: boolean;
  /** Check external links (URLs in manifest) */
  check_external_links: boolean;
  /** Link check configurations */
  link_checks: LinkCheckConfig[];
  /** Require all proofs to be valid */
  require_all_proofs: boolean;
  /** Required field pairs (both must be present or both absent) */
  required_field_pairs: [string, string][];
  /** Allowed DID controllers */
  allowed_controllers: string[];
  /** Required Verifiable Credential types */
  required_vc_types: string[];
  /** TEE attestation checks */
  attestation_checks: AttestationCheckConfig[];
}

/**
 * Default validation configuration
 */
export const defaultValidationConfig: ValidationConfig = {
  mode: "SelfAudit",
  allowed_kya_versions: ["1.0"],
  required_fields: [],
  enforce_controller_match: true,
  check_external_links: false,
  link_checks: [],
  require_all_proofs: false,
  required_field_pairs: [],
  allowed_controllers: [],
  required_vc_types: [],
  attestation_checks: [],
};

/**
 * Options for validateManifest function
 */
export interface ValidateOptions {
  /** Custom validation config (uses default if not provided) */
  config?: ValidationConfig;
  /** Throw on validation failure instead of returning result */
  throwOnFailure?: boolean;
}

/**
 * KYA Manifest structure (minimal interface)
 */
export interface KyaManifest {
  kyaVersion: string;
  agentId: string;
  verificationMethod?: unknown[];
  proof?: unknown[];
  [key: string]: unknown;
}

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly report: ValidationReport
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
