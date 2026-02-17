use crate::resolver::{decode_multibase, resolve_key_for_method};
use crate::types::{CryptoReport, KeyType, Manifest, ResolvedKey, ValidationConfig};
use ed25519_dalek::{Signature as Ed25519Signature, VerifyingKey as Ed25519VerifyingKey};
use k256::ecdsa::signature::Verifier;
use k256::ecdsa::{Signature as SecpSignature, VerifyingKey as SecpVerifyingKey};
use serde_jcs::to_vec as to_jcs_vec;

fn canonicalize_manifest(manifest: &serde_json::Value) -> Result<Vec<u8>, String> {
    let mut clone = manifest.clone();
    if let serde_json::Value::Object(map) = &mut clone {
        map.remove("proof");
    }
    to_jcs_vec(&clone).map_err(|err| format!("Canonicalization failed: {}", err))
}

fn verify_ed25519(public_key: &[u8], signature: &[u8], message: &[u8]) -> Result<(), String> {
    let key_bytes: [u8; 32] = public_key
        .try_into()
        .map_err(|_| "Ed25519 public key must be 32 bytes".to_string())?;
    let key = Ed25519VerifyingKey::from_bytes(&key_bytes)
        .map_err(|err| format!("Invalid Ed25519 key: {}", err))?;
    let signature = Ed25519Signature::from_slice(signature)
        .map_err(|err| format!("Invalid Ed25519 signature: {}", err))?;
    key.verify_strict(message, &signature)
        .map_err(|err| format!("Ed25519 verification failed: {}", err))
}

fn verify_secp256k1(public_key: &[u8], signature: &[u8], message: &[u8]) -> Result<(), String> {
    let key = SecpVerifyingKey::from_sec1_bytes(public_key)
        .map_err(|err| format!("Invalid Secp256k1 key: {}", err))?;
    let signature = SecpSignature::from_slice(signature)
        .or_else(|_| SecpSignature::from_der(signature))
        .map_err(|err| format!("Invalid Secp256k1 signature: {}", err))?;
    key.verify(message, &signature)
        .map_err(|err| format!("Secp256k1 verification failed: {}", err))
}

fn verify_signature(
    resolved: &ResolvedKey,
    signature_bytes: &[u8],
    message: &[u8],
) -> Result<(), String> {
    match resolved.key_type {
        KeyType::Ed25519 => verify_ed25519(&resolved.public_key, signature_bytes, message),
        KeyType::Secp256k1 => verify_secp256k1(&resolved.public_key, signature_bytes, message),
    }
}

pub fn verify_manifest_proofs(
    manifest: &Manifest,
    raw_manifest: &serde_json::Value,
    config: &ValidationConfig,
) -> (bool, Vec<String>, CryptoReport) {
    let mut errors = Vec::new();
    let mut report = CryptoReport::ok();
    let message = match canonicalize_manifest(raw_manifest) {
        Ok(message) => message,
        Err(err) => {
            errors.push(err);
            return (false, errors, report);
        }
    };

    for proof in &manifest.proof {
        let resolved = match resolve_key_for_method(&proof.verification_method, manifest) {
            Ok(resolved) => resolved,
            Err(err) => {
                report
                    .missing_verification_methods
                    .push(proof.verification_method.clone());
                errors.push(err);
                continue;
            }
        };

        if config.enforce_controller_match && resolved.controller != manifest.agent_id {
            errors.push(format!(
                "Verification method controller {} does not match agentId {}",
                resolved.controller, manifest.agent_id
            ));
        }

        report.resolved_keys.push(resolved.id.clone());

        let signature_bytes = match decode_multibase(&proof.proof_value) {
            Ok(bytes) => bytes,
            Err(err) => {
                report
                    .invalid_signatures
                    .push(proof.verification_method.clone());
                errors.push(err);
                continue;
            }
        };

        if let Err(err) = verify_signature(&resolved, &signature_bytes, &message) {
            report
                .invalid_signatures
                .push(proof.verification_method.clone());
            errors.push(err);
        }
    }

    (errors.is_empty(), errors, report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};
    use rand::rngs::OsRng;
    use rand::RngCore;

    #[test]
    fn verify_ed25519_signature_success() {
        let mut secret_bytes = [0u8; 32];
        OsRng.fill_bytes(&mut secret_bytes);
        let signing_key = SigningKey::from_bytes(&secret_bytes);
        let verifying_key = signing_key.verifying_key();
        let public_key = verifying_key.to_bytes();
        let signature = signing_key.sign(b"hello");
        let signature_bytes = signature.to_bytes();
        let result = verify_ed25519(&public_key, &signature_bytes, b"hello");
        assert!(result.is_ok());
    }
}
