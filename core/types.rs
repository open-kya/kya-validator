use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationReport {
    pub schema_valid: bool,
    pub schema_errors: Vec<String>,
    pub ttl_valid: bool,
    pub ttl_errors: Vec<String>,
    pub inspector_valid: bool,
    pub inspector_errors: Vec<String>,
    pub crypto_valid: bool,
    pub crypto_errors: Vec<String>,
    pub crypto_report: Option<CryptoReport>,
    pub policy_valid: bool,
    pub policy_errors: Vec<String>,
}

impl ValidationReport {
    pub fn ok() -> Self {
        Self {
            schema_valid: true,
            schema_errors: Vec::new(),
            ttl_valid: true,
            ttl_errors: Vec::new(),
            inspector_valid: true,
            inspector_errors: Vec::new(),
            crypto_valid: true,
            crypto_errors: Vec::new(),
            crypto_report: None,
            policy_valid: true,
            policy_errors: Vec::new(),
        }
    }

    /// Returns true if all validations passed
    pub fn is_valid(&self) -> bool {
        self.schema_valid
            && self.ttl_valid
            && self.inspector_valid
            && self.crypto_valid
            && self.policy_valid
    }

    /// Collects all errors into a single vector
    pub fn errors(&self) -> Vec<String> {
        let mut all = Vec::new();
        all.extend(self.schema_errors.clone());
        all.extend(self.ttl_errors.clone());
        all.extend(self.inspector_errors.clone());
        all.extend(self.crypto_errors.clone());
        all.extend(self.policy_errors.clone());
        all
    }

    /// Returns warnings (currently empty, can be extended)
    pub fn warnings(&self) -> Vec<String> {
        Vec::new()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VerificationMethod {
    pub id: String,
    #[serde(rename = "type")]
    pub method_type: String,
    pub controller: String,
    pub public_key_multibase: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestProof {
    #[serde(rename = "type")]
    pub proof_type: String,
    pub cryptosuite: Option<String>,
    pub verification_method: String,
    pub proof_purpose: String,
    pub proof_value: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub kya_version: String,
    pub agent_id: String,
    pub verification_method: Option<Vec<VerificationMethod>>,
    pub proof: Vec<ManifestProof>,
    pub max_transaction_value: Option<i64>,
    pub permitted_regions: Option<Vec<String>>,
    pub forbidden_regions: Option<Vec<String>>,
}

impl Manifest {
    pub fn from_value(value: &serde_json::Value) -> Result<Self, String> {
        serde_json::from_value(value.clone()).map_err(|err| err.to_string())
    }
}

#[derive(Debug, Default, Clone)]
pub struct ValidationOptions {
    pub allowed_kya_versions: Vec<String>,
    pub enforce_schema_url: bool,
}

#[derive(Debug, Default, Clone)]
pub struct PolicyContext {
    pub requested_region: Option<String>,
    pub transaction_value: Option<i64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ValidationMode {
    SelfAudit,
    ClientAudit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TlsPinConfig {
    pub expected_certificate_hash: Option<String>,
    pub expected_certificate_pem: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentCheck {
    #[serde(rename = "type")]
    pub check_type: ContentCheckType,
    pub expected_value: String,
    pub json_pointer: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ContentCheckType {
    StringContains,
    StringEquals,
    StringMatchesRegex,
    JsonPointerEquals,
    JsonPointerMatchesRegex,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HashAlgorithm {
    Sha256,
    Sha384,
    Sha512,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DigestConfig {
    pub algorithm: HashAlgorithm,
    pub expected_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkCheckConfig {
    pub json_pointer: String,
    pub required_contains: Option<String>,
    pub tls_pin: Option<TlsPinConfig>,
    pub allowed_domains: Option<Vec<String>>,
    pub content_check: Option<ContentCheck>,
    pub verify_digest: Option<DigestConfig>,
    pub timeout_secs: Option<u64>,
    pub max_retries: Option<u32>,
    pub cache_ttl_secs: Option<u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TEEType {
    SGX,
    Nitro,
    SevSnp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttestationCheckConfig {
    pub json_pointer: String,
    pub tee_type: TEEType,
    pub require_root_certificate: bool,
    pub expected_tcb_info: Option<TcbInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcbInfo {
    pub version: Option<String>,
    pub svn: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ValidationConfig {
    pub mode: ValidationMode,
    pub allowed_kya_versions: Vec<String>,
    pub required_fields: Vec<String>,
    pub enforce_controller_match: bool,
    pub check_external_links: bool,
    pub link_checks: Vec<LinkCheckConfig>,
    pub require_all_proofs: bool,
    pub required_field_pairs: Vec<(String, String)>,
    pub allowed_controllers: Vec<String>,
    pub required_vc_types: Vec<String>,
    pub attestation_checks: Vec<AttestationCheckConfig>,
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            mode: ValidationMode::SelfAudit,
            allowed_kya_versions: vec!["1.0".to_string(), "1.1".to_string()],
            required_fields: Vec::new(),
            enforce_controller_match: true,
            check_external_links: false,
            link_checks: Vec::new(),
            require_all_proofs: false,
            required_field_pairs: Vec::new(),
            allowed_controllers: Vec::new(),
            required_vc_types: Vec::new(),
            attestation_checks: Vec::new(),
        }
    }
}

impl ValidationConfig {
    pub fn self_audit() -> Self {
        Self {
            mode: ValidationMode::SelfAudit,
            allowed_kya_versions: vec!["1.0".to_string(), "1.1".to_string()],
            required_fields: vec!["/agentId".to_string(), "/proof".to_string()],
            enforce_controller_match: true,
            check_external_links: true,
            link_checks: Vec::new(),
            require_all_proofs: true,
            required_field_pairs: Vec::new(),
            allowed_controllers: Vec::new(),
            required_vc_types: Vec::new(),
            attestation_checks: Vec::new(),
        }
    }

    pub fn lenient() -> Self {
        Self {
            mode: ValidationMode::ClientAudit,
            allowed_kya_versions: vec!["1.0".to_string(), "1.1".to_string()],
            required_fields: Vec::new(),
            enforce_controller_match: false,
            check_external_links: false,
            link_checks: Vec::new(),
            require_all_proofs: false,
            required_field_pairs: Vec::new(),
            allowed_controllers: Vec::new(),
            required_vc_types: Vec::new(),
            attestation_checks: Vec::new(),
        }
    }

    pub fn strict() -> Self {
        Self {
            mode: ValidationMode::SelfAudit,
            allowed_kya_versions: vec!["1.0".to_string(), "1.1".to_string()],
            required_fields: vec![
                "/agentId".to_string(),
                "/name".to_string(),
                "/proof".to_string(),
            ],
            enforce_controller_match: true,
            check_external_links: true,
            link_checks: Vec::new(),
            require_all_proofs: true,
            required_field_pairs: Vec::new(),
            allowed_controllers: Vec::new(),
            required_vc_types: Vec::new(),
            attestation_checks: Vec::new(),
        }
    }

    pub fn client_audit() -> Self {
        Self {
            mode: ValidationMode::ClientAudit,
            allowed_kya_versions: vec!["1.0".to_string(), "1.1".to_string()],
            required_fields: vec!["/agentId".to_string(), "/proof".to_string()],
            enforce_controller_match: true,
            check_external_links: false,
            link_checks: Vec::new(),
            require_all_proofs: true,
            required_field_pairs: Vec::new(),
            allowed_controllers: Vec::new(),
            required_vc_types: Vec::new(),
            attestation_checks: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DidDocument {
    pub id: Option<String>,
    #[serde(rename = "verificationMethod")]
    pub verification_method: Option<Vec<VerificationMethod>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CryptoReport {
    pub resolved_keys: Vec<String>,
    pub invalid_signatures: Vec<String>,
    pub missing_verification_methods: Vec<String>,
}

impl CryptoReport {
    pub fn ok() -> Self {
        Self {
            resolved_keys: Vec::new(),
            invalid_signatures: Vec::new(),
            missing_verification_methods: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum KeyType {
    Ed25519,
    Secp256k1,
}

#[derive(Debug, Clone)]
pub(crate) struct ResolvedKey {
    pub id: String,
    pub controller: String,
    pub key_type: KeyType,
    pub public_key: Vec<u8>,
}
