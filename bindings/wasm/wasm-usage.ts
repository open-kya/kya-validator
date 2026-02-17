/**
 * KYA Validator - WebAssembly Usage Examples (TypeScript)
 * Browser and Node.js examples
 */

import * as kya from './kya_validator_bg.js';

// ============================================
// Browser Example
// ============================================

async function browserExample(): Promise<void> {
  // Example manifest
  const manifest = {
    kyaVersion: "1.0",
    agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    verificationMethod: [
      {
        id: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1",
        type: "Ed25519VerificationKey2020",
        controller: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        publicKeyMultibase: "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
      }
    ],
    proof: [
      {
        type: "Ed25519Signature2020",
        verificationMethod: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1",
        proofPurpose: "assertionMethod",
        proofValue: "..."
      }
    ]
  };
  
  const manifestJson = JSON.stringify(manifest);
  
  // Get default config
  const defaultConfig = kya.get_default_config();
  console.log("Default config:", defaultConfig);
  
  // Validate with default config
  const result1 = kya.validate_manifest_default(manifestJson);
  console.log("Validation result:", result1);
  console.log("Success:", result1.success);
  console.log("Report:", JSON.parse(result1.report));
  
  // Validate with custom config
  const config = {
    mode: "SelfAudit" as const,
    allowed_kya_versions: ["1.0", "1.1"],
    required_fields: ["/agentId", "/proof"],
    enforce_controller_match: true,
    check_external_links: false,
    link_checks: [],
    require_all_proofs: true,
    required_field_pairs: [],
    allowed_controllers: [],
    required_vc_types: [],
    attestation_checks: []
  };
  
  const result2 = kya.validate_manifest(manifestJson, JSON.stringify(config));
  console.log("Custom config result:", result2);
  
  // Helper functions
  console.log("Version:", kya.get_version());
  console.log("Name:", kya.get_name());
  console.log("Valid JSON:", kya.is_valid_json('{"test": true}'));
  console.log("Formatted JSON:", kya.format_json('{"test":true}'));
}

// ============================================
// Node.js Example
// ============================================

async function nodeJsExample(): Promise<void> {
  // Example manifest
  const manifest = {
    kyaVersion: "1.0",
    agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    proof: []
  };
  
  const manifestJson = JSON.stringify(manifest);
  
  // Validate
  const result = kya.validate_manifest_default(manifestJson);
  
  if (result.success) {
    console.log("✅ Manifest is valid!");
    const report = JSON.parse(result1.report);
    console.log("Schema valid:", report.schema_valid);
    console.log("Crypto valid:", report.crypto_valid);
    console.log("TTL valid:", report.ttl_valid);
    console.log("Policy valid:", report.policy_valid);
  } else {
    console.log("❌ Manifest validation failed!");
    const report = JSON.parse(result.report);
    console.log("Schema errors:", report.schema_errors);
    console.log("Crypto errors:", report.crypto_errors);
    console.log("Policy errors:", report.policy_errors);
  }
}

// ============================================
// Advanced Usage with Custom Config
// ============================================

function advancedUsage(): void {
  // Custom configuration for strict validation
  const strictConfig = {
    mode: "ClientAudit" as const,
    allowed_kya_versions: ["1.0"],
    required_fields: [
      "/kyaVersion",
      "/agentId",
      "/proof",
      "/maxTransactionValue"
    ],
    enforce_controller_match: true,
    check_external_links: true,
    link_checks: [
      {
        json_pointer: "/schemaUrl",
        required_contains: "kya-manifest",
        timeout_secs: 10,
        max_retries: 3
      }
    ],
    require_all_proofs: true,
    required_field_pairs: [
      ["/agentId", "/verificationMethod/0/controller"]
    ],
    allowed_controllers: [],
    required_vc_types: [],
    attestation_checks: [
      {
        json_pointer: "/attestation/quote",
        tee_type: "SGX" as const,
        require_root_certificate: true,
        expected_tcb_info: {
          version: "1.0",
          svn: 2
        }
      }
    ]
  };
  
  const manifest = {
    kyaVersion: "1.0",
    agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    proof: [],
    maxTransactionValue: 1000000,
    attestation: {
      quote: "base64_encoded_quote..."
    }
  };
  
  const result = kya.validate_manifest(
    JSON.stringify(manifest),
    JSON.stringify(strictConfig)
  );
  
  console.log("Strict validation:", result);
}

// ============================================
// Error Handling
// ============================================

function errorHandlingExample(): void {
  try {
    // Invalid JSON
    const result1 = kya.validate_manifest_default("not json");
    console.log("Result 1:", result1);
  } catch (error) {
    console.error("Error 1:", error instanceof Error ? error.message : String(error));
  }
  
  try {
    // Valid JSON but invalid manifest
    const invalidManifest = {
      kyaVersion: "999.0",  // Invalid version
      agentId: "invalid-did",
      proof: []
    };
    const result2 = kya.validate_manifest_default(JSON.stringify(invalidManifest));
    console.log("Result 2:", result2);
    console.log("Success:", result2.success);
    const report = JSON.parse(result2.report);
    console.log("Errors:", report.schema_errors);
  } catch (error) {
    console.error("Error 2:", error instanceof Error ? error.message : String(error));
  }
}

// ============================================
// Performance Tips
// ============================================

function performanceTips(): void {
  // Tip 1: Format manifest once
  const manifest = { kyaVersion: "1.0", agentId: "...", proof: [] };
  const manifestJson = JSON.stringify(manifest);
  
  // Tip 2: Cache config
  const config = kya.get_default_config();
  const configObj = JSON.parse(config);
  
  // Tip 3: Reuse config for multiple validations
  const manifests = [manifest1, manifest2, manifest3];
  const results = manifests.map(m => 
    kya.validate_manifest(JSON.stringify(m), JSON.stringify(configObj))
  );
  
  // Tip 4: Use is_valid_json before validation
  const input = getManifestFromInput();
  if (!kya.is_valid_json(input)) {
    return; // Skip validation
  }
  const result = kya.validate_manifest_default(input);
}

function getManifestFromInput(): string {
  return "{}";
}

// ============================================
// Export examples
// ============================================

export {
  browserExample,
  nodeJsExample,
  advancedUsage,
  errorHandlingExample,
  performanceTips
};
