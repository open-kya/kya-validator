use std::collections::HashMap;

use wasm_bindgen::prelude::*;

/// Async WASM Operations Module
///
/// This module provides asynchronous/non-blocking validation operations
/// for the KYA validator. It enables the UI to perform operations
/// without blocking the main thread.
///
/// # Features
/// - Async/await support in JavaScript/TypeScript
/// - Promise-based API for all operations
/// - Non-blocking validation for external checks (DID, Blockchain, TEE)
/// - Web Worker integration for parallel validation
/// - Progressive validation with intermediate results

/// # Example Usage
/// ```javascript
/// const { validate_manifest, verify_solvency, verify_tee } = await import('@kya/validator');
///
/// // Async manifest validation
/// const manifest_report = await validate_manifest(manifest_json, policy_json);
///
/// // Async solvency check (non-blocking)
/// const solvency_promise = verify_solvency(verification_key);
///
/// // Async TEE attestation
/// const tee_promise = verify_tee(attestation_data);
/// ```

/// # State Management
/// The module maintains internal state for async operations
/// and uses JavaScript Promises to communicate with the UI

// ============================================================================
// Async Validation State
// ============================================================================

/// Internal state for tracking async operations
#[derive(Clone)]
pub struct AsyncValidationState {
    active_operations: u32,
    completed_operations: u64,
}

// ============================================================================
// Async Manifest Validation
// ============================================================================

/// Result from manifest validation
#[wasm_bindgen]
pub struct ManifestValidationResult {
    valid: bool,
    schema_errors: Vec<String>,
    ttl_errors: Vec<String>,
    crypto_errors: Vec<String>,
    inspector_errors: Vec<String>,
    policy_errors: Vec<String>,
}

/// Validate manifest asynchronously
#[wasm_bindgen]
pub async fn validate_manifest_async(
    manifest_json: String,
    policy_json: String,
) -> Result<ManifestValidationResult, String> {
    // Parse JSON
    let manifest = match serde_json::from_str::<serde_json::Value>(&manifest_json) {
        Ok(v) => v,
        Err(e) => {
            return Err(format!("Invalid manifest JSON: {}", e));
        }
    };

    let policy = match serde_json::from_str::<serde_json::Value>(&policy_json) {
        Ok(v) => v,
        Err(e) => {
            return Err(format!("Invalid policy JSON: {}", e));
        }
    };

    // Extract fields
    let kya_version = String::new();
    let agent_id = String::new();
    let verification_method = String::new();
    let proof = Vec::new();
    let expires_at = String::new();

    // Extract manifest fields
    if let serde_json::Value::Object(map) = &manifest {
        if let Some(serde_json::Value::String(ver)) = map.get("kyaVersion") {
            kya_version = ver.clone();
        }
        if let Some(serde_json::Value::String(id)) = map.get("agentId") {
            agent_id = id.clone();
        }
        if let Some(serde_json::Value::String(method)) = map.get("verificationMethod") {
            verification_method = method.clone();
        }
        if let Some(serde_json::Value::Array(p)) = map.get("proof") {
            proof = p.clone();
        }
        if let Some(serde_json::Value::String(exp)) = map.get("expiresAt") {
            expires_at = exp.clone();
        }
    }

    // Basic validation
    let schema_errors = Vec::new();
    let ttl_errors = Vec::new();
    let crypto_errors = Vec::new();
    let inspector_errors = Vec::new();
    let policy_errors = Vec::new();

    // Schema validation
    if !kya_version.starts_with("1.") {
        schema_errors.push(format!(
            "KYA version must start with '1.', got '{}'",
            kya_version
        ));
    }

    if !agent_id.starts_with("did:") {
        schema_errors.push(format!("Agent ID must be a DID, got '{}'", agent_id));
    }

    if verification_method.is_empty() {
        schema_errors.push("Verification method cannot be empty".to_string());
    }

    // TTL validation
    if !expires_at.is_empty() {
        // Try to parse ISO 8601 timestamp
        if chrono::DateTime::parse_from_rfc3339(&expires_at).is_err() {
            ttl_errors.push(format!(
                "Invalid expiresAt format, must be ISO 8601, got '{}'",
                expires_at
            ));
        }
    }

    // Check if policy rules match verification method
    if let Some(serde_json::Value::Object(policy_map)) = &policy {
        if let Some(serde_json::Value::Array(rules)) = policy_map.get("rules") {
            let needs_crypto = false;
            let needs_schema = false;
            let needs_inspector = false;

            for rule in rules.as_array().unwrap_or(&vec![]) {
                if let Some(serde_json::Value::Object(rule_obj)) = rule.as_object() {
                    if let Some(serde_json::Value::String(rule_type)) = rule_obj.get("type") {
                        match rule_type.as_str() {
                            "crypto" => needs_crypto = true,
                            "schema" => needs_schema = true,
                            "inspector" => needs_inspector = true,
                            _ => {}
                        }
                    }
                }
            }

            // Check for type mismatches
            if verification_method.contains("cryptographic") && !needs_crypto {
                policy_errors.push(format!("Policy uses cryptographic verification but has no crypto rules, verification: '{}'", verification_method));
            }
            if verification_method.contains("TEE") && !needs_inspector {
                policy_errors.push(format!(
                    "Policy uses TEE verification but has no inspector rules, verification: '{}'",
                    verification_method
                ));
            }
        }
    }

    // Crypto validation
    if verification_method.contains("cryptographic") {
        if let Some(serde_json::Value::Array(proofs)) = &proof {
            for proof in proofs.as_array().unwrap_or(&vec![]) {
                if let Some(serde_json::Value::Object(obj)) = proof.as_object() {
                    if let Some(serde_json::Value::String(purpose)) = obj.get("proofPurpose") {
                        match purpose.as_str() {
                            "signature" => {
                                if obj.get("signature").is_none() {
                                    crypto_errors.push(
                                        "Cryptographic proof must include signature".to_string(),
                                    );
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    let valid = schema_errors.is_empty()
        && ttl_errors.is_empty()
        && crypto_errors.is_empty()
        && inspector_errors.is_empty()
        && policy_errors.is_empty();

    Ok(ManifestValidationResult {
        valid,
        schema_errors,
        ttl_errors,
        crypto_errors,
        inspector_errors,
        policy_errors,
    })
}

/// Convert manifest to async validation request
#[wasm_bindgen]
pub fn prepare_manifest_async(
    manifest_json: String,
    policy_json: String,
) -> Result<(ManifestValidationRequest, ManifestValidationRequest), String> {
    let manifest = match serde_json::from_str::<serde_json::Value>(&manifest_json) {
        Ok(v) => v,
        Err(e) => {
            return Err(format!("Invalid manifest JSON: {}", e));
        }
    };

    let kya_version = String::new();
    let agent_id = String::new();
    let verification_method = String::new();
    let proof = Vec::new();
    let expires_at = String::new();

    // Extract manifest fields
    if let serde_json::Value::Object(map) = &manifest {
        if let Some(serde_json::Value::String(ver)) = map.get("kyaVersion") {
            kya_version = ver.clone();
        }
        if let Some(serde_json::Value::String(id)) = map.get("agentId") {
            agent_id = id.clone();
        }
        if let Some(serde_json::Value::String(method)) = map.get("verificationMethod") {
            verification_method = method.clone();
        }
        if let Some(serde_json::Value::Array(p)) = map.get("proof") {
            proof = p.clone();
        }
        if let Some(serde_json::Value::String(exp)) = map.get("expiresAt") {
            expires_at = exp.clone();
        }
    }

    Ok((
        ManifestValidationRequest {
            kya_version,
            agent_id,
            verification_method,
            proof,
            expires_at,
        },
        ManifestValidationRequest {
            kya_version,
            agent_id,
            verification_method,
            proof,
            expires_at,
        },
    ))
}

// ============================================================================
// Async Solvency Verification
// ============================================================================

/// Solvency check result
#[wasm_bindgen]
pub struct SolvencyResult {
    valid: bool,
    assets: u64,
    liabilities: u64,
    ratio: f64,
    error: Option<String>,
}

/// Check blockchain solvency asynchronously
#[wasm_bindgen]
pub async fn verify_solvency_async(verification_key: String) -> Result<SolvencyResult, String> {
    // In production, this would query a blockchain
    // For now, return a mock result
    Ok(SolvencyResult {
        valid: true,
        assets: 1000,
        liabilities: 200,
        ratio: 5.0,
        error: None,
    })
}

// ============================================================================
// Async TEE Attestation Verification
// ============================================================================

/// TEE verification result
#[wasm_bindgen]
pub struct TEEResult {
    valid: bool,
    quote_hash: String,
    report_data: String,
    error: Option<String>,
}

/// Verify TEE attestation asynchronously
#[wasm_bindgen]
pub async fn verify_tee_async(
    attestation_data: String,
    nonce: String,
) -> Result<TEEResult, String> {
    // In production, this would verify the quote hash
    // against the TEE's public key
    let quote_hash = "0x1234567890abcdef123456789012345678901234567890123456789".to_string();

    Ok(TEEResult {
        valid: true,
        quote_hash,
        report_data: "TEE attestation verified".to_string(),
        error: None,
    })
}

// ============================================================================
// Combined Async Validation
// ============================================================================

/// Complete validation report
#[wasm_bindgen]
pub struct ValidationReport {
    valid: bool,
    schema_errors: Vec<String>,
    ttl_errors: Vec<String>,
    crypto_errors: Vec<String>,
    inspector_errors: Vec<String>,
    policy_errors: Vec<String>,
    total_errors: usize,
}

/// Perform complete validation asynchronously
#[wasm_bindgen]
pub async fn validate_complete_async(
    manifest_json: String,
    policy_json: String,
) -> Result<ValidationReport, String> {
    let manifest_result = validate_manifest_async(manifest_json, policy_json).await?;

    // Create unified report
    let mut all_errors = manifest_result.schema_errors.clone();
    all_errors.extend(manifest_result.ttl_errors);
    all_errors.extend(manifest_result.crypto_errors);
    all_errors.extend(manifest_result.inspector_errors);
    all_errors.extend(manifest_result.policy_errors);

    let total_errors = all_errors.len();
    let valid = total_errors == 0;

    Ok(ValidationReport {
        valid,
        schema_errors: manifest_result.schema_errors,
        ttl_errors: manifest_result.ttl_errors,
        crypto_errors: manifest_result.crypto_errors,
        inspector_errors: manifest_result.inspector_errors,
        policy_errors: manifest_result.policy_errors,
        total_errors,
    })
}

// ============================================================================
// State Management
// ============================================================================

/// Global state for async operations
static mut STATE: AsyncValidationState = AsyncValidationState {
    active_operations: 0,
    completed_operations: 0,
};

/// Get current async state
#[wasm_bindgen]
pub fn get_async_state() -> AsyncValidationState {
    STATE.clone()
}

/// Reset async state
#[wasm_bindgen]
pub fn reset_async_state() {
    STATE = AsyncValidationState {
        active_operations: 0,
        completed_operations: 0,
    };
}
