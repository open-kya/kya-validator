// WebAssembly bindings for KYA Validator
// Enables use in browser and Node.js environments

use crate::types::ValidationConfig;
use crate::validator::validate_manifest_with_config;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// WebAssembly-compatible validation result
#[derive(Debug, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct WasmValidationResult {
    pub success: bool,
    pub report: String,
}

/// Validate a KYA manifest from JSON string
#[wasm_bindgen]
pub fn validate_manifest(
    manifest_json: &str,
    config_json: &str,
) -> Result<WasmValidationResult, JsError> {
    // Parse manifest
    let manifest: serde_json::Value = serde_json::from_str(manifest_json)
        .map_err(|e| JsError::new(&format!("Invalid manifest JSON: {}", e)))?;

    // Parse config
    let config: ValidationConfig = serde_json::from_str(config_json)
        .map_err(|e| JsError::new(&format!("Invalid config JSON: {}", e)))?;

    // Validate
    let report = validate_manifest_with_config(&manifest, &config);

    // Serialize report
    let report_str = serde_json::to_string_pretty(&report)
        .map_err(|e| JsError::new(&format!("Failed to serialize report: {}", e)))?;

    Ok(WasmValidationResult {
        success: report.schema_valid
            && report.ttl_valid
            && report.inspector_valid
            && report.crypto_valid
            && report.policy_valid,
        report: report_str,
    })
}

/// Validate a KYA manifest with default configuration
#[wasm_bindgen]
pub fn validate_manifest_default(manifest_json: &str) -> Result<WasmValidationResult, JsError> {
    let config = ValidationConfig::default();
    let config_json = serde_json::to_string(&config)
        .map_err(|e| JsError::new(&format!("Failed to serialize config: {}", e)))?;

    validate_manifest(manifest_json, &config_json)
}

/// Get the default validation configuration
#[wasm_bindgen]
pub fn get_default_config() -> Result<String, JsError> {
    let config = ValidationConfig::default();
    serde_json::to_string_pretty(&config)
        .map_err(|e| JsError::new(&format!("Failed to serialize config: {}", e)))
}

/// Check if a string is valid JSON
#[wasm_bindgen]
pub fn is_valid_json(input: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(input).is_ok()
}

/// Format JSON with pretty printing
#[wasm_bindgen]
pub fn format_json(input: &str) -> Result<String, JsError> {
    let value: serde_json::Value =
        serde_json::from_str(input).map_err(|e| JsError::new(&format!("Invalid JSON: {}", e)))?;

    serde_json::to_string_pretty(&value)
        .map_err(|e| JsError::new(&format!("Failed to format JSON: {}", e)))
}

/// Get validator version
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get validator name
#[wasm_bindgen]
pub fn get_name() -> String {
    env!("CARGO_PKG_NAME").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_validate() {
        let manifest = r#"{
            "kyaVersion": "1.0",
            "agentId": "did:key:z6Mk..."
        }"#;

        let result = validate_manifest_default(manifest);
        assert!(result.is_ok());
    }

    #[test]
    fn test_is_valid_json() {
        assert!(is_valid_json(r#"{"test": true}"#));
        assert!(!is_valid_json(r#"{"test": "#));
    }

    #[test]
    fn test_format_json() {
        let input = r#"{"test":true}"#;
        let result = format_json(input);
        assert!(result.is_ok());
    }
}
