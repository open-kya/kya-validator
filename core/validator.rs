use crate::inspector::inspect_manifest;
use crate::policy::{apply_policy, AllowedRegionRule, MaxTransactionValueRule, PolicyRule};
use crate::types::{
    AttestationCheckConfig, ContentCheckType, DigestConfig, HashAlgorithm, LinkCheckConfig,
    Manifest, PolicyContext, TEEType, TlsPinConfig, ValidationConfig, ValidationOptions,
    ValidationReport,
};
use crate::verifier::verify_manifest_proofs;
use chrono::{DateTime, Utc};
use serde_json::Value;
use sha2::{Digest, Sha256, Sha384, Sha512};
use std::time::Duration;

# [cfg(not(target_arch = "wasm32"))]
use jsonschema::{Draft, JSONSchema};

#[cfg(not(target_arch = "wasm32"))]
use once_cell::sync::Lazy;

#[cfg(not(target_arch = "wasm32"))]
use regex::Regex;

#[cfg(not(target_arch = "wasm32"))]
use reqwest::blocking::Client;

#[cfg(not(target_arch = "wasm32"))]
use std::collections::HashMap;

#[cfg(not(target_arch = "wasm32"))]
use std::sync::Mutex;

#[cfg(not(target_arch = "wasm32"))]
use std::time::Instant;

static KYA_SCHEMA: &str = include_str!("../schema/kya-manifest.schema.json");

#[cfg(not(target_arch = "wasm32"))]
static COMPILED_SCHEMA: Lazy<JSONSchema> = Lazy::new(|| {
    let schema_json: Value =
        serde_json::from_str(KYA_SCHEMA).expect("KYA schema JSON should parse at compile time");
    JSONSchema::options()
        .with_draft(Draft::Draft7)
        .compile(&schema_json)
        .expect("KYA schema should compile")
});

#[cfg(not(target_arch = "wasm32"))]
static CACHE: Lazy<Mutex<HashMap<String, (Value, Instant)>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn parse_datetime(value: &Value, field: &str) -> Result<Option<DateTime<Utc>>, String> {
    match value.get(field) {
        Some(Value::String(raw)) => DateTime::parse_from_rfc3339(raw)
            .map(|dt| Some(dt.with_timezone(&Utc)))
            .map_err(|err| format!("Invalid {}: {}", field, err)),
        Some(_) => Err(format!("{} must be an RFC3339 string", field)),
        None => Ok(None),
    }
}

fn validate_ttl(manifest: &Value, now: DateTime<Utc>) -> (bool, Vec<String>) {
    let mut errors = Vec::new();

    let issuance = parse_datetime(manifest, "issuanceDate");
    let expiration = parse_datetime(manifest, "expirationDate");

    if let Err(err) = issuance.as_ref() {
        errors.push(err.to_string());
    }
    if let Err(err) = expiration.as_ref() {
        errors.push(err.to_string());
    }

    let issuance = issuance.ok().flatten();
    let expiration = expiration.ok().flatten();

    if let Some(issuance) = issuance {
        if issuance > now {
            errors.push("issuanceDate is in the future".to_string());
        }
    }

    if let Some(expiration) = expiration {
        if expiration < now {
            errors.push("expirationDate is in the past".to_string());
        }
    }

    (errors.is_empty(), errors)
}

pub fn validate_manifest_value(manifest: &Value) -> ValidationReport {
    validate_manifest_with_config(manifest, &ValidationConfig::default())
}

fn check_required_fields(manifest: &Value, required_fields: &[String]) -> Vec<String> {
    let mut errors = Vec::new();
    for pointer in required_fields {
        if manifest.pointer(pointer).is_none() {
            errors.push(format!("Missing required field {}", pointer));
        }
    }
    errors
}

fn check_required_field_pairs(manifest: &Value, pairs: &[(String, String)]) -> Vec<String> {
    let mut errors = Vec::new();
    for (left, right) in pairs {
        let left_value = manifest.pointer(left);
        let right_value = manifest.pointer(right);
        if left_value.is_some() && right_value.is_none() {
            errors.push(format!("Field {} requires {}", left, right));
        }
        if right_value.is_some() && left_value.is_none() {
            errors.push(format!("Field {} requires {}", right, left));
        }
    }
    errors
}

#[cfg(not(target_arch = "wasm32"))]
#[allow(dead_code)]
fn verify_tls_pin(_cert_der: &[u8], _pin_config: &TlsPinConfig) -> Result<(), String> {
    // TODO: Implement TLS pinning
    // Note: reqwest doesn't provide direct access to peer certificates
    // Would need to use native-tls and custom connector for full TLS pinning support
    // For now, this is a placeholder
    Ok(())
}

fn validate_domain_allowlist(url: &str, allowed_domains: &[String]) -> Result<(), String> {
    let parsed = url::Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;
    let host = parsed.host_str().ok_or("URL has no host")?;

    if !allowed_domains.is_empty() && !allowed_domains.iter().any(|domain| host.ends_with(domain)) {
        return Err(format!("Domain {} is not in allowlist", host));
    }

    Ok(())
}

#[cfg(not(target_arch = "wasm32"))]
fn perform_content_check(
    text: &str,
    content_value: &Value,
    check_config: &crate::types::ContentCheck,
) -> Result<(), String> {
    match check_config.check_type {
        ContentCheckType::StringContains => {
            if !text.contains(&check_config.expected_value) {
                return Err(format!(
                    "Content does not contain expected string: {}",
                    check_config.expected_value
                ));
            }
        }
        ContentCheckType::StringEquals => {
            if text != check_config.expected_value {
                return Err(format!(
                    "Content does not equal expected value: {}",
                    check_config.expected_value
                ));
            }
        }
        ContentCheckType::StringMatchesRegex => {
            let regex = Regex::new(&check_config.expected_value)
                .map_err(|e| format!("Invalid regex: {}", e))?;
            if !regex.is_match(text) {
                return Err(format!(
                    "Content does not match regex: {}",
                    check_config.expected_value
                ));
            }
        }
        ContentCheckType::JsonPointerEquals | ContentCheckType::JsonPointerMatchesRegex => {
            let pointer = check_config
                .json_pointer
                .as_ref()
                .ok_or("json_pointer required for JSON pointer checks")?;
            let target_value = content_value
                .pointer(pointer)
                .ok_or(format!("JSON pointer {} not found in content", pointer))?;

            let target_str = target_value
                .as_str()
                .ok_or("Target value is not a string")?;

            if check_config.check_type == ContentCheckType::JsonPointerEquals {
                if target_str != check_config.expected_value {
                    return Err(format!(
                        "JSON pointer value does not match: {} != {}",
                        target_str, check_config.expected_value
                    ));
                }
            } else {
                let regex = Regex::new(&check_config.expected_value)
                    .map_err(|e| format!("Invalid regex: {}", e))?;
                if !regex.is_match(target_str) {
                    return Err(format!(
                        "JSON pointer value does not match regex: {}",
                        check_config.expected_value
                    ));
                }
            }
        }
    }
    Ok(())
}

#[cfg(not(target_arch = "wasm32"))]
fn fetch_with_retry(
    url: &str,
    timeout_secs: Option<u64>,
    max_retries: Option<u32>,
) -> Result<reqwest::blocking::Response, String> {
    let timeout = Duration::from_secs(timeout_secs.unwrap_or(30));
    let retries = max_retries.unwrap_or(3);

    let mut last_error: String = String::new();

    for attempt in 0..retries {
        let client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

        match client.get(url).send() {
            Ok(response) => return Ok(response),
            Err(err) => {
                last_error = err.to_string();
                if attempt < retries - 1 {
                    std::thread::sleep(Duration::from_millis(1000 * (attempt + 1) as u64));
                }
            }
        }
    }

    Err(format!("Failed after {} attempts: {}", retries, last_error))
}

fn compute_hash(data: &[u8], algorithm: HashAlgorithm) -> String {
    match algorithm {
        HashAlgorithm::Sha256 => {
            let mut hasher = Sha256::new();
            hasher.update(data);
            let result = hasher.finalize();
            hex::encode(result)
        }
        HashAlgorithm::Sha384 => {
            let mut hasher = Sha384::new();
            hasher.update(data);
            let result = hasher.finalize();
            hex::encode(result)
        }
        HashAlgorithm::Sha512 => {
            let mut hasher = Sha512::new();
            hasher.update(data);
            let result = hasher.finalize();
            hex::encode(result)
        }
    }
}

fn verify_content_hash(data: &[u8], config: &DigestConfig) -> Result<(), String> {
    let computed = compute_hash(data, config.algorithm);
    let expected = config.expected_hash.to_lowercase();
    let computed = computed.to_lowercase();

    if computed != expected {
        return Err(format!(
            "Hash mismatch. Expected: {}, Got: {}",
            expected, computed
        ));
    }

    Ok(())
}

#[cfg(not(target_arch = "wasm32"))]
fn check_external_links(manifest: &Value, link_checks: &[LinkCheckConfig]) -> Vec<String> {
    let mut errors = Vec::new();

    for check in link_checks {
        let url_value = manifest.pointer(&check.json_pointer);
        let url = match url_value.and_then(|value| value.as_str()) {
            Some(url) => url,
            None => {
                errors.push(format!("Missing URL for {}", check.json_pointer));
                continue;
            }
        };

        if let Some(ref allowed_domains) = check.allowed_domains {
            if let Err(e) = validate_domain_allowlist(url, allowed_domains) {
                errors.push(e);
                continue;
            }
        }

        let cache_key = url.to_string();
        let cached_result: Option<Value> = check.cache_ttl_secs.and_then(|ttl| {
            let cache = CACHE.lock().ok()?;
            if let Some((value, timestamp)) = cache.get(&cache_key) {
                if timestamp.elapsed() < Duration::from_secs(ttl) {
                    return Some(value.clone());
                }
            }
            None
        });

        let response_bytes = if let Some(cached) = cached_result {
            cached
        } else {
            let response = match fetch_with_retry(url, check.timeout_secs, check.max_retries) {
                Ok(resp) => resp,
                Err(err) => {
                    errors.push(format!("Failed to fetch {}: {}", url, err));
                    continue;
                }
            };

            let bytes: Vec<u8> = match response.bytes() {
                Ok(bytes) => bytes.to_vec(),
                Err(err) => {
                    errors.push(format!("Failed to read {}: {}", url, err));
                    continue;
                }
            };

            if let Some(ref digest_config) = check.verify_digest {
                if let Err(e) = verify_content_hash(&bytes, digest_config) {
                    errors.push(format!("Digest verification failed for {}: {}", url, e));
                    continue;
                }
            }

            if let Some(_ttl) = check.cache_ttl_secs {
                if let Ok(mut cache) = CACHE.lock() {
                    // Cache the response text for content checks
                    let text = String::from_utf8_lossy(&bytes).to_string();
                    let cache_entry: (Value, Instant) = (Value::String(text), Instant::now());
                    cache.insert(cache_key, cache_entry);
                }
            }

            Value::String(String::from_utf8_lossy(&bytes).to_string())
        };

        if let Some(expected) = check.required_contains.as_ref() {
            let text = response_bytes.as_str().unwrap_or("");
            if !text.contains(expected) {
                errors.push(format!(
                    "{} did not contain expected string: {}",
                    url, expected
                ));
            }
        }

        if let Some(ref content_check) = check.content_check {
            if let Err(e) = perform_content_check(
                response_bytes.as_str().unwrap_or(""),
                &response_bytes,
                content_check,
            ) {
                errors.push(format!("Content check failed for {}: {}", url, e));
            }
        }
    }

    errors
}

fn verify_sgx_attestation(
    _attestation_data: &[u8],
    config: &AttestationCheckConfig,
) -> Result<(), String> {
    // Placeholder for SGX attestation verification
    // In production, this would use mc-sgx-dcap-quoteverify or similar
    if config.require_root_certificate {
        // Verify root certificate chain
        // This is a stub - actual implementation would verify against Intel root CAs
    }

    if let Some(ref _tcb_info) = config.expected_tcb_info {
        // Verify TCB version and SVN
        // This is a stub - actual implementation would parse quote and verify TCB
    }

    Ok(())
}

fn verify_nitro_attestation(
    _attestation_data: &[u8],
    _config: &AttestationCheckConfig,
) -> Result<(), String> {
    // Placeholder for AWS Nitro attestation verification
    // Parse Nitro attestation document and verify against AWS root certificate
    Ok(())
}

fn verify_sev_snp_attestation(
    _attestation_data: &[u8],
    _config: &AttestationCheckConfig,
) -> Result<(), String> {
    // Placeholder for AMD SEV-SNP attestation verification
    // Verify VCEK report and certificate chain
    Ok(())
}

fn check_attestations(
    manifest: &Value,
    attestation_checks: &[AttestationCheckConfig],
) -> Vec<String> {
    let mut errors = Vec::new();

    for check in attestation_checks {
        let attestation_value = manifest.pointer(&check.json_pointer);
        let attestation_data: Result<Vec<u8>, String> =
            match attestation_value.and_then(|value| value.as_str()) {
                Some(data) => hex::decode(data)
                    .map_err(|e| format!("Failed to decode attestation hex: {}", e)),
                None => Err("Missing attestation data".to_string()),
            };

        let attestation_data: Vec<u8> = match attestation_data {
            Ok(data) => data,
            Err(e) => {
                errors.push(format!("Attestation check {}: {}", check.json_pointer, e));
                continue;
            }
        };

        let result = match check.tee_type {
            TEEType::SGX => verify_sgx_attestation(&attestation_data, check),
            TEEType::Nitro => verify_nitro_attestation(&attestation_data, check),
            TEEType::SevSnp => verify_sev_snp_attestation(&attestation_data, check),
        };

        if let Err(e) = result {
            errors.push(format!(
                "Attestation verification failed for {}: {:?}",
                check.json_pointer, check.tee_type
            ));
            errors.push(e);
        }
    }

    errors
}

fn check_allowed_controllers(manifest: &Value, allowed: &[String]) -> Vec<String> {
    if allowed.is_empty() {
        return Vec::new();
    }
    let controller = match manifest
        .pointer("/agentId")
        .and_then(|value| value.as_str())
    {
        Some(controller) => controller,
        None => return vec!["Missing agentId for controller allowlist".to_string()],
    };
    if !allowed.iter().any(|item| item == controller) {
        return vec![format!("Controller {} is not in allowlist", controller)];
    }
    Vec::new()
}

fn check_required_vc_types(manifest: &Value, required: &[String]) -> Vec<String> {
    if required.is_empty() {
        return Vec::new();
    }
    let vcs = match manifest.pointer("/verifiableCredential") {
        Some(Value::Array(entries)) => entries,
        _ => {
            return vec![format!(
                "Missing required VC types: {}",
                required.join(", ")
            )];
        }
    };

    let mut missing = Vec::new();
    for required_type in required {
        let mut found = false;
        for entry in vcs {
            if let Some(Value::Array(types)) = entry.get("type") {
                if types
                    .iter()
                    .any(|value| value.as_str() == Some(required_type))
                {
                    found = true;
                    break;
                }
            }
        }
        if !found {
            missing.push(required_type.clone());
        }
    }

    if missing.is_empty() {
        Vec::new()
    } else {
        vec![format!("Missing required VC types: {}", missing.join(", "))]
    }
}

pub fn validate_manifest_with_config(
    manifest: &Value,
    config: &ValidationConfig,
) -> ValidationReport {
    let mut report = ValidationReport::ok();

    // Schema validation only available on native targets (requires jsonschema with reqwest blocking)
    #[cfg(not(target_arch = "wasm32"))]
    {
        let schema_result = COMPILED_SCHEMA.validate(manifest);
        if let Err(errors) = schema_result {
            report.schema_valid = false;
            report.schema_errors = errors
                .map(|err: jsonschema::ValidationError| err.to_string())
                .collect();
        }
    }

    // On WASM, skip schema validation (would require async fetch for external refs)
    #[cfg(target_arch = "wasm32")]
    {
        report.schema_valid = true;
        report.schema_errors = vec!["Schema validation skipped on WASM (use browser fetch for remote schemas)".to_string()];
    }

    let (ttl_valid, ttl_errors) = validate_ttl(manifest, Utc::now());
    report.ttl_valid = ttl_valid;
    report.ttl_errors = ttl_errors;

    let required_field_errors = check_required_fields(manifest, &config.required_fields);
    if !required_field_errors.is_empty() {
        report.inspector_valid = false;
        report.inspector_errors.extend(required_field_errors);
    }

    let required_pair_errors = check_required_field_pairs(manifest, &config.required_field_pairs);
    if !required_pair_errors.is_empty() {
        report.inspector_valid = false;
        report.inspector_errors.extend(required_pair_errors);
    }

    let controller_errors = check_allowed_controllers(manifest, &config.allowed_controllers);
    if !controller_errors.is_empty() {
        report.inspector_valid = false;
        report.inspector_errors.extend(controller_errors);
    }

    let vc_errors = check_required_vc_types(manifest, &config.required_vc_types);
    if !vc_errors.is_empty() {
        report.inspector_valid = false;
        report.inspector_errors.extend(vc_errors);
    }

    // External link checking only available on native (requires blocking HTTP client)
    #[cfg(not(target_arch = "wasm32"))]
    if config.check_external_links {
        let link_errors = check_external_links(manifest, &config.link_checks);
        if !link_errors.is_empty() {
            report.inspector_valid = false;
            report.inspector_errors.extend(link_errors);
        }
    }

    if !config.attestation_checks.is_empty() {
        let attestation_errors = check_attestations(manifest, &config.attestation_checks);
        if !attestation_errors.is_empty() {
            report.inspector_valid = false;
            report.inspector_errors.extend(attestation_errors);
        }
    }

    if let Ok(parsed_manifest) = Manifest::from_value(manifest) {
        if config.require_all_proofs && parsed_manifest.proof.is_empty() {
            report.crypto_valid = false;
            report.crypto_errors.push("No proofs provided".to_string());
        }
        let options = ValidationOptions {
            allowed_kya_versions: config.allowed_kya_versions.clone(),
            enforce_schema_url: false,
        };
        let (inspector_valid, inspector_errors) = inspect_manifest(&parsed_manifest, &options);
        if !inspector_valid {
            report.inspector_valid = false;
            report.inspector_errors.extend(inspector_errors);
        }

        let (crypto_valid, crypto_errors, crypto_report) =
            verify_manifest_proofs(&parsed_manifest, manifest, config);
        report.crypto_valid = crypto_valid;
        report.crypto_errors = crypto_errors;
        report.crypto_report = Some(crypto_report);

        let rules: Vec<Box<dyn PolicyRule>> = vec![
            Box::new(AllowedRegionRule),
            Box::new(MaxTransactionValueRule),
        ];
        let context = PolicyContext::default();
        let (policy_valid, policy_errors) = apply_policy(&parsed_manifest, &context, &rules);
        report.policy_valid = policy_valid;
        report.policy_errors = policy_errors;
    } else {
        report.inspector_valid = false;
        report
            .inspector_errors
            .push("Failed to parse manifest".to_string());
        report.crypto_valid = false;
        report
            .crypto_errors
            .push("Failed to parse manifest".to_string());
        report.policy_valid = false;
        report
            .policy_errors
            .push("Failed to parse manifest".to_string());
    }
    report
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn schema_validation_fails_on_empty_object() {
        let value = json!({});
        let report = validate_manifest_value(&value);
        assert!(!report.schema_valid);
        assert!(!report.schema_errors.is_empty());
    }

    #[test]
    fn ttl_validation_detects_future_and_expired() {
        let value = json!({
            "issuanceDate": "2999-01-01T00:00:00Z",
            "expirationDate": "2000-01-01T00:00:00Z"
        });
        let report = validate_manifest_value(&value);
        assert!(!report.ttl_valid);
        assert_eq!(report.ttl_errors.len(), 2);
    }
}
