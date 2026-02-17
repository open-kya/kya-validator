/**
 * KYA Validator - WebAssembly Usage Examples
 * Browser and Node.js examples
 */

// ============================================
// Browser Example
// ============================================

async function browserExample() {
  // Load WASM module
  const kya = await import('./kya_validator_bg.js');
  
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
    mode: "SelfAudit",
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

async function nodeJsExample() {
  // Load WASM module
  const kya = require('./kya_validator_bg.js');
  
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
    const report = JSON.parse(result.report);
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
// React/TypeScript Example
// ============================================

import * as kya from './kya_validator_bg.js';

interface Manifest {
  kyaVersion: string;
  agentId: string;
  proof: any[];
}

function ReactExample() {
  const [manifest, setManifest] = useState<string>("");
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const handleValidate = () => {
    try {
      // Check if JSON is valid
      if (!kya.is_valid_json(manifest)) {
        alert("Invalid JSON format!");
        return;
      }
      
      // Validate manifest
      const result = kya.validate_manifest_default(manifest);
      
      if (result.success) {
        const report = JSON.parse(result.report);
        setValidationResult(report);
        console.log("✅ Validation successful!");
      } else {
        const report = JSON.parse(result.report);
        setValidationResult(report);
        console.log("❌ Validation failed!");
      }
    } catch (error) {
      console.error("Validation error:", error);
    }
  };
  
  return (
    <div>
      <textarea
        value={manifest}
        onChange={(e) => setManifest(e.target.value)}
        placeholder="Enter KYA manifest JSON..."
      />
      <button onClick={handleValidate}>Validate</button>
      
      {validationResult && (
        <div>
          <h3>Validation Report</h3>
          <p>Schema: {validationResult.schema_valid ? "✅" : "❌"}</p>
          <p>Crypto: {validationResult.crypto_valid ? "✅" : "❌"}</p>
          <p>TTL: {validationResult.ttl_valid ? "✅" : "❌"}</p>
          <p>Policy: {validationResult.policy_valid ? "✅" : "❌"}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Advanced Usage with Custom Config
// ============================================

function advancedUsage() {
  const kya = require('./kya_validator_bg.js');
  
  // Custom configuration for strict validation
  const strictConfig = {
    mode: "ClientAudit",
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
        tee_type: "SGX",
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

function errorHandlingExample() {
  const kya = require('./kya_validator_bg.js');
  
  try {
    // Invalid JSON
    const result1 = kya.validate_manifest_default("not json");
    console.log("Result 1:", result1);
  } catch (error) {
    console.error("Error 1:", error.message);
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
    console.error("Error 2:", error.message);
  }
}

// ============================================
// Performance Tips
// ============================================

function performanceTips() {
  const kya = require('./kya_validator_bg.js');
  
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

// ============================================
// Integration with Web Workers
// ============================================

// worker.js
self.onmessage = async (e) => {
  const { manifest, config } = e.data;
  const kya = await import('./kya_validator_bg.js');
  
  const result = kya.validate_manifest(manifest, config);
  
  self.postMessage(result);
};

// main.js
async function validateInWorker(manifest, config) {
  const worker = new Worker('worker.js');
  
  worker.postMessage({ manifest, config });
  
  return new Promise((resolve) => {
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
  });
}

// ============================================
// Export for use in other modules
// ============================================

module.exports = {
  browserExample,
  nodeJsExample,
  ReactExample,
  advancedUsage,
  errorHandlingExample,
  performanceTips
};
