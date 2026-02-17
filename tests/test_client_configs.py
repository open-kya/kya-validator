"""Client-side configuration validation scenarios for KYA manifests."""

import json
from copy import deepcopy

from kya_validator import validate_manifest_json_with_config

BASE_MANIFEST = {
    "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/security/data-integrity/v2",
        "https://w3id.org/security/suites/ed25519-2020/v1",
        "https://w3id.org/kya/v1",
    ],
    "id": "urn:uuid:example",
    "type": ["VerifiablePresentation", "KyaManifest"],
    "kyaVersion": "1.1.0",
    "agentId": "did:web:trusted.example",
    "verificationMethod": [
        {
            "id": "did:web:trusted.example#key-1",
            "type": "Ed25519VerificationKey2020",
            "controller": "did:web:trusted.example",
            "publicKeyMultibase": "z6MkvhY9Qy3Y6cF1s7g8p4vFq3mQk6oQxJ5Y2n8m7s4V1p",
        }
    ],
    "authentication": ["did:web:trusted.example#key-1"],
    "assertionMethod": ["did:web:trusted.example#key-1"],
    "capabilityInvocation": ["did:web:trusted.example#key-1"],
    "proof": [
        {
            "type": "DataIntegrityProof",
            "cryptosuite": "eddsa-jcs-2022",
            "verificationMethod": "did:web:trusted.example#key-1",
            "proofPurpose": "capabilityInvocation",
            "proofValue": "z3u2R2w9oYpYxQmVb1p7XkQbq7rYJv5tL4bqj1m2n3p4q5r6s7",
        }
    ],
    "verifiableCredential": [
        {
            "id": "urn:uuid:legal-entity",
            "type": ["VerifiableCredential", "LegalEntityCredential"],
            "issuer": "did:web:issuer.example",
            "issuanceDate": "2024-01-01T00:00:00Z",
            "credentialSubject": {
                "legalName": "Trusted LLC",
                "jurisdiction": "DK",
            },
            "proof": {"type": "DataIntegrityProof"},
        }
    ],
}


def _report(manifest: dict, config: dict) -> dict:
    result = validate_manifest_json_with_config(
        json.dumps(manifest),
        json.dumps(config),
    )
    return json.loads(result)


def test_client_requires_legal_entity_vc():
    config = {
        "mode": "clientAudit",
        "allowedKyaVersions": ["1.1"],
        "requiredFields": ["/agentId", "/proof"],
        "requiredVcTypes": ["LegalEntityCredential"],
        "requireAllProofs": True,
        "enforceControllerMatch": False,
        "checkExternalLinks": False,
        "linkChecks": [],
    }

    manifest = deepcopy(BASE_MANIFEST)
    manifest.pop("verifiableCredential")
    report = _report(manifest, config)

    assert report["inspectorValid"] is False
    assert any("Missing required VC types" in err for err in report["inspectorErrors"])


def test_client_accepts_only_allowlisted_controllers():
    config = {
        "mode": "clientAudit",
        "allowedKyaVersions": ["1.1"],
        "requiredFields": ["/agentId", "/proof"],
        "allowedControllers": ["did:web:trusted.example"],
        "requireAllProofs": True,
        "enforceControllerMatch": False,
        "checkExternalLinks": False,
        "linkChecks": [],
    }

    manifest = deepcopy(BASE_MANIFEST)
    manifest["agentId"] = "did:web:untrusted.example"
    report = _report(manifest, config)

    assert report["inspectorValid"] is False
    assert any("not in allowlist" in err for err in report["inspectorErrors"])


def test_client_accepts_matching_controller_and_vc():
    config = {
        "mode": "clientAudit",
        "allowedKyaVersions": ["1.1"],
        "requiredFields": ["/agentId", "/proof"],
        "requiredVcTypes": ["LegalEntityCredential"],
        "allowedControllers": ["did:web:trusted.example"],
        "requireAllProofs": True,
        "enforceControllerMatch": False,
        "checkExternalLinks": False,
        "linkChecks": [],
    }

    report = _report(deepcopy(BASE_MANIFEST), config)

    assert report["schemaValid"] is True
    assert report["inspectorValid"] is True


def test_client_required_field_pairs():
    config = {
        "mode": "clientAudit",
        "allowedKyaVersions": ["1.1"],
        "requiredFields": ["/agentId", "/proof"],
        "requiredFieldPairs": [["/solvencyAddress", "/solvencyChain"]],
        "requireAllProofs": True,
        "enforceControllerMatch": False,
        "checkExternalLinks": False,
        "linkChecks": [],
    }

    manifest = deepcopy(BASE_MANIFEST)
    manifest["solvencyAddress"] = "0xdeadbeef"
    report = _report(manifest, config)

    assert report["inspectorValid"] is False
    assert any("requires" in err for err in report["inspectorErrors"])
