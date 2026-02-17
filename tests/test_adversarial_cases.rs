use kya_validator::types::{
    AttestationCheckConfig, ContentCheck, ContentCheckType, DigestConfig, HashAlgorithm,
    LinkCheckConfig, TEEType, TcbInfo, ValidationConfig,
};
use kya_validator::validator::validate_manifest_with_config;
use serde_json::json;

/// Test Case 1: Invalid @context - Missing KYA context
#[test]
fn test_missing_kya_context() {
    let manifest = json!({
        "@context": [
            "https://www.w3.org/2018/credentials/v1"
        ],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [],
        "authentication": [],
        "assertionMethod": [],
        "capabilityInvocation": [],
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to missing KYA context
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for missing KYA context"
    );
}

/// Test Case 2: Invalid type - Missing required types
#[test]
fn test_missing_required_types() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [],
        "authentication": [],
        "assertionMethod": [],
        "capabilityInvocation": [],
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to missing KyaManifest type
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for missing KyaManifest type"
    );
}

/// Test Case 3: Invalid DID format
#[test]
fn test_invalid_did_format() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "invalid-did-format",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "invalid-did-format",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid DID format
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid DID format"
    );
}

/// Test Case 4: Invalid hex string format
#[test]
fn test_invalid_hex_format() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "deployment": {
            "tee": {
                "framework": "sgx",
                "measurementHash": "invalid-hex-with-g-and-z"
            }
        },
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid hex format
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid hex format"
    );
}

/// Test Case 5: Invalid SHA-256 hash length
#[test]
fn test_invalid_sha256_hash() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "legal": {
            "termsHash": "ABC123" // Too short for SHA-256
        },
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid SHA-256 hash length
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid SHA-256 hash"
    );
}

/// Test Case 6: Invalid duration format
#[test]
fn test_invalid_duration_format() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "operatingLimits": {
            "periodDuration": "30x" // Invalid duration unit
        },
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid duration format
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid duration format"
    );
}

/// Test Case 7: Invalid currency code length
#[test]
fn test_invalid_currency_code() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "currency": "US", // Too short (should be 3 characters)
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid currency code length
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid currency code length"
    );
}

/// Test Case 8: Invalid TEE framework
#[test]
fn test_invalid_tee_framework() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "deployment": {
            "tee": {
                "framework": "invalidTee" // Not in enum
            }
        },
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid TEE framework
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid TEE framework"
    );
}

/// Test Case 9: Invalid VC type - missing VerifiableCredential
#[test]
fn test_invalid_vc_type() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "verifiableCredential": [{
            "id": "urn:uuid:12345678-1234-1234-1234-123456789013",
            "type": ["CustomCredential"], // Missing VerifiableCredential
            "issuer": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "credentialSubject": {},
            "proof": {
                "type": "Ed25519Signature2020",
                "verificationMethod": "#key-1",
                "proofPurpose": "assertionMethod",
                "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
            }
        }],
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to missing VerifiableCredential type
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for missing VerifiableCredential type"
    );
}

/// Test Case 10: Invalid proof purpose
#[test]
fn test_invalid_proof_purpose() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "invalidPurpose", // Should be "capabilityInvocation"
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid proof purpose
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid proof purpose"
    );
}

/// Test Case 11: Missing required verification method fields
#[test]
fn test_missing_verification_method_fields() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1"
            // Missing type, controller, publicKeyMultibase
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to missing required verification method fields
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for missing verification method fields"
    );
}

/// Test Case 12: Invalid governance visibility
#[test]
fn test_invalid_governance_visibility() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "governance": {
            "controlUri": "https://example.com/control",
            "visibility": "invalidVisibility" // Not in enum
        },
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid governance visibility
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid governance visibility"
    );
}

/// Test Case 13: Invalid dispute resolution mechanism
#[test]
fn test_invalid_dispute_resolution_mechanism() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "legal": {
            "disputeResolution": [{
                "priority": 1,
                "mechanism": "invalidMechanism" // Not in enum
            }]
        },
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig::default();
    let report = validate_manifest_with_config(&manifest, &config);

    // Should fail schema validation due to invalid dispute resolution mechanism
    assert!(
        !report.schema_valid,
        "Expected schema validation to fail for invalid dispute resolution mechanism"
    );
}

/// Test Case 14: TEE attestation check with invalid data
#[test]
fn test_tee_attestation_invalid_data() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "deployment": {
            "tee": {
                "framework": "sgx",
                "measurementHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "attestationData": "invalid-hex-not-even" // Invalid hex
            }
        },
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig {
        attestation_checks: vec![AttestationCheckConfig {
            json_pointer: "/deployment/tee/attestationData".to_string(),
            tee_type: TEEType::SGX,
            require_root_certificate: true,
            expected_tcb_info: Some(TcbInfo {
                version: Some("1.0".to_string()),
                svn: Some(1),
            }),
        }],
        ..Default::default()
    };

    let report = validate_manifest_with_config(&manifest, &config);

    // Should have inspector errors due to invalid attestation data
    assert!(
        !report.inspector_valid,
        "Expected inspector validation to fail for invalid attestation data"
    );
    assert!(
        !report.inspector_errors.is_empty(),
        "Expected inspector errors for invalid attestation"
    );
}

/// Test Case 15: Content check with invalid regex
#[test]
fn test_content_check_invalid_regex() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "policyUrl": "https://example.com/policy.json",
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig {
        check_external_links: true,
        link_checks: vec![LinkCheckConfig {
            json_pointer: "/policyUrl".to_string(),
            required_contains: None,
            tls_pin: None,
            allowed_domains: None,
            content_check: Some(ContentCheck {
                check_type: ContentCheckType::StringMatchesRegex,
                expected_value: "[invalid regex(".to_string(), // Invalid regex
                json_pointer: None,
            }),
            verify_digest: None,
            timeout_secs: Some(5),
            max_retries: Some(1),
            cache_ttl_secs: None,
        }],
        ..Default::default()
    };

    let report = validate_manifest_with_config(&manifest, &config);

    // Should have inspector errors due to invalid regex
    assert!(
        !report.inspector_valid,
        "Expected inspector validation to fail for invalid regex"
    );
    assert!(
        !report.inspector_errors.is_empty(),
        "Expected inspector errors for invalid regex"
    );
}

/// Test Case 16: Domain allowlist violation
#[test]
fn test_domain_allowlist_violation() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "policyUrl": "https://malicious-site.com/policy.json", // Not in allowlist
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig {
        check_external_links: true,
        link_checks: vec![LinkCheckConfig {
            json_pointer: "/policyUrl".to_string(),
            required_contains: None,
            tls_pin: None,
            allowed_domains: Some(vec!["trusted-domain.com".to_string()]),
            content_check: None,
            verify_digest: None,
            timeout_secs: Some(5),
            max_retries: Some(1),
            cache_ttl_secs: None,
        }],
        ..Default::default()
    };

    let report = validate_manifest_with_config(&manifest, &config);

    // Should have inspector errors due to domain not in allowlist
    assert!(
        !report.inspector_valid,
        "Expected inspector validation to fail for domain not in allowlist"
    );
    assert!(
        !report.inspector_errors.is_empty(),
        "Expected inspector errors for domain violation"
    );
}

/// Test Case 17: Missing required field pairs
#[test]
fn test_missing_required_field_pairs() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "maxTransactionValue": 1000, // Has max value but no currency
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig {
        required_field_pairs: vec![("/maxTransactionValue".to_string(), "/currency".to_string())],
        ..Default::default()
    };

    let report = validate_manifest_with_config(&manifest, &config);

    // Should have inspector errors due to missing required field pair
    assert!(
        !report.inspector_valid,
        "Expected inspector validation to fail for missing required field pair"
    );
    assert!(
        !report.inspector_errors.is_empty(),
        "Expected inspector errors for missing field pair"
    );
}

/// Test Case 18: Controller not in allowlist
#[test]
fn test_controller_not_in_allowlist() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig {
        allowed_controllers: vec!["did:key:trustedController123".to_string()],
        ..Default::default()
    };

    let report = validate_manifest_with_config(&manifest, &config);

    // Should have inspector errors due to controller not in allowlist
    assert!(
        !report.inspector_valid,
        "Expected inspector validation to fail for controller not in allowlist"
    );
    assert!(
        !report.inspector_errors.is_empty(),
        "Expected inspector errors for controller not in allowlist"
    );
}

/// Test Case 19: Missing required VC types
#[test]
fn test_missing_required_vc_types() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "verifiableCredential": [{
            "id": "urn:uuid:12345678-1234-1234-1234-123456789013",
            "type": ["VerifiableCredential", "SomeOtherCredential"],
            "issuer": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "credentialSubject": {},
            "proof": {
                "type": "Ed25519Signature2020",
                "verificationMethod": "#key-1",
                "proofPurpose": "assertionMethod",
                "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
            }
        }],
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig {
        required_vc_types: vec!["SolvencyCredential".to_string()],
        ..Default::default()
    };

    let report = validate_manifest_with_config(&manifest, &config);

    // Should have inspector errors due to missing required VC type
    assert!(
        !report.inspector_valid,
        "Expected inspector validation to fail for missing required VC type"
    );
    assert!(
        !report.inspector_errors.is_empty(),
        "Expected inspector errors for missing required VC type"
    );
}

/// Test Case 20: Hash verification with mismatched algorithm
#[test]
fn test_hash_verification_mismatched_algorithm() {
    let manifest = json!({
        "@context": ["https://w3id.org/kya/v1"],
        "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
        "type": ["VerifiablePresentation", "KyaManifest"],
        "kyaVersion": "1.0",
        "agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
        "verificationMethod": [{
            "id": "#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2",
            "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2"
        }],
        "authentication": ["#key-1"],
        "assertionMethod": ["#key-1"],
        "capabilityInvocation": ["#key-1"],
        "schemaUrl": "https://example.com/schema.json",
        "proof": [{
            "type": "Ed25519Signature2020",
            "verificationMethod": "#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z4MXdiNmmVZ9qMvxZC7PQ8P9vJxRv6zZ7Y8e3r5QK6vQ8cF7z8z6Z5r9pN8j9V3xG9k4K2"
        }]
    });

    let config = ValidationConfig {
        check_external_links: true,
        link_checks: vec![LinkCheckConfig {
            json_pointer: "/schemaUrl".to_string(),
            required_contains: None,
            tls_pin: None,
            allowed_domains: None,
            content_check: None,
            verify_digest: Some(DigestConfig {
                algorithm: HashAlgorithm::Sha256,
                expected_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                    .to_string(),
            }),
            timeout_secs: Some(5),
            max_retries: Some(1),
            cache_ttl_secs: None,
        }],
        ..Default::default()
    };

    let report = validate_manifest_with_config(&manifest, &config);

    // Should have inspector errors due to hash mismatch (example.com doesn't return empty string)
    assert!(
        !report.inspector_valid || !report.inspector_errors.is_empty(),
        "Expected inspector validation to fail or have errors for hash mismatch"
    );
}
