#![allow(unsafe_op_in_unsafe_fn)]

#[cfg(feature = "python")]
use pyo3::exceptions::PyValueError;
#[cfg(feature = "python")]
use pyo3::prelude::*;

pub mod blockchain;
pub mod inspector;
pub mod policy;
pub mod policy_advanced;
pub mod resolver;
pub mod tee;
pub mod types;
pub mod validator;
pub mod verifier;

#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
pub mod streaming;
#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
pub mod wasm_async;

#[cfg(feature = "wasm")]
pub mod wasm;

// Export types for wasm modules
pub use types::{
    CryptoReport, DigestConfig, HashAlgorithm, LinkCheckConfig, Manifest, ManifestProof,
    PolicyContext, ValidationConfig, ValidationMode, ValidationOptions, ValidationReport,
    VerificationMethod,
};

// Async WASM types
#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
pub use wasm_async::{AsyncValidationState, SolvencyResult, TEEResult};

// Streaming Validation types
#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
pub use streaming::{ChunkValidationResult, StreamingValidationState, StreamingValidator};

#[cfg(feature = "python")]
#[pyfunction]
#[allow(unsafe_op_in_unsafe_fn)]
fn validate_manifest_json(manifest_json: &str) -> PyResult<String> {
    let manifest: serde_json::Value = serde_json::from_str(manifest_json)
        .map_err(|err| PyValueError::new_err(format!("Invalid JSON: {}", err)))?;
    let report = crate::validator::validate_manifest_value(&manifest);
    serde_json::to_string_pretty(&report)
        .map_err(|err| PyValueError::new_err(format!("Failed to serialize report: {}", err)))
}

#[cfg(feature = "python")]
#[pyfunction]
#[allow(unsafe_op_in_unsafe_fn)]
fn validate_manifest_json_with_config(manifest_json: &str, config_json: &str) -> PyResult<String> {
    let manifest: serde_json::Value = serde_json::from_str(manifest_json)
        .map_err(|err| PyValueError::new_err(format!("Invalid JSON: {}", err)))?;
    let config: ValidationConfig = serde_json::from_str(config_json)
        .map_err(|err| PyValueError::new_err(format!("Invalid config JSON: {}", err)))?;
    let report = crate::validator::validate_manifest_with_config(&manifest, &config);
    serde_json::to_string_pretty(&report)
        .map_err(|err| PyValueError::new_err(format!("Failed to serialize report: {}", err)))
}

#[cfg(feature = "python")]
#[pyfunction]
#[allow(unsafe_op_in_unsafe_fn)]
fn verify_tee_evidence_json(evidence_json: &str) -> PyResult<String> {
    let evidence: crate::tee::TeeEvidence = serde_json::from_str(evidence_json)
        .map_err(|err| PyValueError::new_err(format!("Invalid TEE evidence JSON: {}", err)))?;
    let report = crate::tee::verify_tee_evidence(&evidence)
        .map_err(|err| PyValueError::new_err(format!("TEE verification failed: {}", err)))?;
    serde_json::to_string_pretty(&report)
        .map_err(|err| PyValueError::new_err(format!("Failed to serialize report: {}", err)))
}

#[cfg(feature = "python")]
#[pyfunction]
#[allow(unsafe_op_in_unsafe_fn)]
fn inspect_manifest_json(manifest_json: &str) -> PyResult<String> {
    let manifest: Manifest = serde_json::from_str(manifest_json)
        .map_err(|err| PyValueError::new_err(format!("Invalid manifest JSON: {}", err)))?;
    let options = ValidationOptions::default();
    let (valid, errors) = crate::inspector::inspect_manifest(&manifest, &options);
    let result = serde_json::json!({
        "valid": valid,
        "errors": errors,
    });
    serde_json::to_string_pretty(&result)
        .map_err(|err| PyValueError::new_err(format!("Failed to serialize result: {}", err)))
}

#[cfg(feature = "python")]
#[pyfunction]
#[allow(unsafe_op_in_unsafe_fn)]
fn resolve_did_pkh_json(did: &str) -> PyResult<String> {
    let info = crate::resolver::parse_did_pkh(did)
        .map_err(|err| PyValueError::new_err(format!("Invalid did:pkh: {}", err)))?;
    let network = format!("{:?}", info.network);
    let result = serde_json::json!({
        "network": network,
        "address": info.address,
        "chainId": info.chain_id,
    });
    serde_json::to_string_pretty(&result)
        .map_err(|err| PyValueError::new_err(format!("Failed to serialize result: {}", err)))
}

#[cfg(feature = "python")]
#[pyfunction]
#[allow(unsafe_op_in_unsafe_fn)]
fn get_version() -> PyResult<String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[cfg(feature = "python")]
#[pyfunction]
#[allow(unsafe_op_in_unsafe_fn)]
fn get_name() -> PyResult<String> {
    Ok(env!("CARGO_PKG_NAME").to_string())
}

#[cfg(feature = "python")]
#[pymodule]
fn _core(_py: Python<'_>, module: &PyModule) -> PyResult<()> {
    module.add_function(wrap_pyfunction!(validate_manifest_json, module)?)?;
    module.add_function(wrap_pyfunction!(
        validate_manifest_json_with_config,
        module
    )?)?;
    module.add_function(wrap_pyfunction!(verify_tee_evidence_json, module)?)?;
    module.add_function(wrap_pyfunction!(inspect_manifest_json, module)?)?;
    module.add_function(wrap_pyfunction!(resolve_did_pkh_json, module)?)?;
    module.add_function(wrap_pyfunction!(get_version, module)?)?;
    module.add_function(wrap_pyfunction!(get_name, module)?)?;
    Ok(())
}
