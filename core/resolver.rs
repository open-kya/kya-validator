use crate::types::{DidDocument, KeyType, Manifest, ResolvedKey, VerificationMethod};
use std::collections::HashMap;

#[cfg(not(target_arch = "wasm32"))]
use reqwest::blocking::Client;

pub(crate) fn resolve_verification_methods(
    manifest: &Manifest,
) -> HashMap<String, VerificationMethod> {
    let mut methods = HashMap::new();
    if let Some(list) = manifest.verification_method.as_ref() {
        for method in list {
            methods.insert(method.id.clone(), method.clone());
        }
    }
    methods
}

pub fn decode_multibase(input: &str) -> Result<Vec<u8>, String> {
    let mut chars = input.chars();
    let prefix = chars
        .next()
        .ok_or_else(|| "Empty multibase value".to_string())?;
    let payload: String = chars.collect();
    match prefix {
        'z' => bs58::decode(payload)
            .into_vec()
            .map_err(|err| format!("Base58 decode failed: {}", err)),
        _ => Err(format!("Unsupported multibase prefix: {}", prefix)),
    }
}

fn read_varint(bytes: &[u8]) -> Result<(u64, usize), String> {
    let mut result = 0u64;
    let mut shift = 0u32;
    for (index, byte) in bytes.iter().enumerate() {
        let value = (byte & 0x7F) as u64;
        result |= value << shift;
        if (byte & 0x80) == 0 {
            return Ok((result, index + 1));
        }
        shift += 7;
    }
    Err("Invalid varint".to_string())
}

fn key_type_from_method(method_type: &str) -> Result<KeyType, String> {
    match method_type {
        "Ed25519VerificationKey2020" => Ok(KeyType::Ed25519),
        "EcdsaSecp256k1VerificationKey2019" => Ok(KeyType::Secp256k1),
        other => Err(format!("Unsupported key type: {}", other)),
    }
}

fn key_type_from_multicodec(code: u64) -> Result<KeyType, String> {
    match code {
        0xed => Ok(KeyType::Ed25519),
        0xe7 => Ok(KeyType::Secp256k1),
        other => Err(format!("Unsupported multicodec: {}", other)),
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub(crate) fn resolve_did_web(did: &str) -> Result<DidDocument, String> {
    let did_parts = did
        .strip_prefix("did:web:")
        .ok_or_else(|| "Invalid did:web format".to_string())?;
    let parts: Vec<&str> = did_parts.split(':').collect();
    let domain = parts
        .first()
        .ok_or_else(|| "Missing did:web domain".to_string())?;
    let path = if parts.len() > 1 {
        format!("/{}/did.json", parts[1..].join("/"))
    } else {
        "/.well-known/did.json".to_string()
    };
    let url = format!("https://{}{}", domain, path);

    let client = Client::new();
    let response = client
        .get(&url)
        .send()
        .map_err(|err| format!("Failed to fetch DID document: {}", err))?;
    response
        .json::<DidDocument>()
        .map_err(|err| format!("Failed to parse DID document: {}", err))
}

#[cfg(target_arch = "wasm32")]
pub(crate) fn resolve_did_web(_did: &str) -> Result<DidDocument, String> {
    Err("DID web resolution not supported on WASM - use browser fetch".to_string())
}

pub(crate) fn resolve_did_key(did: &str) -> Result<ResolvedKey, String> {
    let encoded = did
        .strip_prefix("did:key:")
        .ok_or_else(|| "Invalid did:key format".to_string())?;
    let decoded = decode_multibase(encoded)?;
    let (codec, offset) = read_varint(&decoded)?;
    let key_type = key_type_from_multicodec(codec)?;
    let key_bytes = decoded
        .get(offset..)
        .ok_or_else(|| "Missing key material".to_string())?
        .to_vec();
    let method_id = format!("{}#key-1", did);
    Ok(ResolvedKey {
        id: method_id,
        controller: did.to_string(),
        key_type,
        public_key: key_bytes,
    })
}

pub(crate) fn resolve_key_from_method(method: &VerificationMethod) -> Result<ResolvedKey, String> {
    let key_type = key_type_from_method(&method.method_type)?;
    let public_key_multibase = method
        .public_key_multibase
        .as_ref()
        .ok_or_else(|| "Missing publicKeyMultibase".to_string())?;
    let key_bytes = decode_multibase(public_key_multibase)?;
    Ok(ResolvedKey {
        id: method.id.clone(),
        controller: method.controller.clone(),
        key_type,
        public_key: key_bytes,
    })
}

/// Blockchain network identifier for did:pkh
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BlockchainNetwork {
    Ethereum,
    Polygon,
    Bsc,
    Arbitrum,
    Optimism,
    Avalanche,
    Other(String),
}

/// Parsed did:pkh information
#[derive(Debug, Clone)]
pub struct DidPkhInfo {
    pub network: BlockchainNetwork,
    pub address: String,
    pub chain_id: Option<u64>,
}

/// Parse did:pkh to extract blockchain address
/// Format: did:pkh:eip155:chainId:address
pub fn parse_did_pkh(did: &str) -> Result<DidPkhInfo, String> {
    let parts: Vec<&str> = did.split(':').collect();

    if parts.len() < 4 {
        return Err(format!("Invalid did:pkh format: {}", did));
    }

    // did:pkh is two parts: "did" and "pkh"
    let did_method = format!("{}:{}", parts[0], parts[1]);
    if did_method != "did:pkh" {
        return Err(format!("Expected did:pkh, got: {}", did_method));
    }

    // After "did:pkh", the next parts are: method, chainId, address
    if parts.len() < 5 {
        return Err(format!(
            "Invalid did:pkh format: expected 5 parts, got {}",
            parts.len()
        ));
    }

    let method = parts[2];
    if method != "eip155" {
        return Err(format!("Unsupported did:pkh method: {}", method));
    }

    let chain_id: u64 = parts[3]
        .parse()
        .map_err(|e| format!("Invalid chain ID: {}", e))?;

    let address = parts[4];

    // Validate Ethereum address format
    if address.len() != 42 || !address.starts_with("0x") {
        return Err("Invalid Ethereum address format".to_string());
    }

    let network = match chain_id {
        1 => BlockchainNetwork::Ethereum,
        137 => BlockchainNetwork::Polygon,
        56 => BlockchainNetwork::Bsc,
        42161 => BlockchainNetwork::Arbitrum,
        10 => BlockchainNetwork::Optimism,
        43114 => BlockchainNetwork::Avalanche,
        _ => BlockchainNetwork::Other(format!("chain-{}", chain_id)),
    };

    Ok(DidPkhInfo {
        network,
        address: address.to_lowercase(),
        chain_id: Some(chain_id),
    })
}

pub(crate) fn resolve_key_for_method(
    method_id: &str,
    manifest: &Manifest,
) -> Result<ResolvedKey, String> {
    let methods = resolve_verification_methods(manifest);
    if let Some(method) = methods.get(method_id) {
        return resolve_key_from_method(method);
    }

    let did = method_id
        .split('#')
        .next()
        .ok_or_else(|| "Invalid verification method".to_string())?;

    if did.starts_with("did:key:") {
        let mut resolved = resolve_did_key(did)?;
        resolved.id = method_id.to_string();
        return Ok(resolved);
    }

    if did.starts_with("did:web:") {
        let document = resolve_did_web(did)?;
        if let Some(methods) = document.verification_method {
            if let Some(method) = methods.iter().find(|entry| entry.id == method_id) {
                return resolve_key_from_method(method);
            }
            return Err(format!("Verification method {} not found", method_id));
        }
        return Err(format!("No verification methods for {}", did));
    }

    if did.starts_with("did:pkh:") {
        let _pkh_info = parse_did_pkh(did)?;
        return Err(format!(
            "did:pkh is for solvency links, not cryptographic verification. \
            Network: {:?}, Address: {}",
            _pkh_info.network, _pkh_info.address
        ));
    }

    Err(format!("Unsupported DID method in {}", method_id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_did_key_decodes_multibase() {
        let bytes = vec![0xed, 0x01, 0x02, 0x03, 0x04];
        let encoded = format!("z{}", bs58::encode(&bytes).into_string());
        let did = format!("did:key:{}", encoded);
        let resolved = resolve_did_key(&did).expect("should resolve did:key");
        assert_eq!(resolved.key_type, KeyType::Ed25519);
        assert_eq!(resolved.public_key, vec![0x02, 0x03, 0x04]);
        assert_eq!(resolved.controller, did);
    }
}
