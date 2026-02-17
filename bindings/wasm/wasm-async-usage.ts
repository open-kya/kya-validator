/**
 * KYA Validator - Async WASM Usage Examples
 * Browser and Node.js examples for asynchronous validation
 */

// ============================================
// Basic Async Validation
// ============================================

async function basicAsyncValidation() {
    const kya = await import('./kya_validator_bg.js');

    const manifest = {
        kyaVersion: "1.0",
        agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        proof: []
    };

    const config = {
        mode: "SelfAudit",
        allowed_kya_versions: ["1.0"],
        required_fields: [],
        enforce_controller_match: true,
        check_external_links: false,
        link_checks: [],
        require_all_proofs: false,
        required_field_pairs: [],
        allowed_controllers: [],
        required_vc_types: [],
        attestation_checks: []
    };

    try {
        const result = await kya.validate_manifest_async(
            JSON.stringify(manifest),
            JSON.stringify(config)
        );

        if (result.success) {
            console.log("✅ Manifest is valid!");
            const report = JSON.parse(result.report);
            console.log("Schema valid:", report.schema_valid);
            console.log("Crypto valid:", report.crypto_valid);
        } else {
            console.log("❌ Manifest validation failed!");
            const report = JSON.parse(result.report);
            console.log("Errors:", report.schema_errors);
        }
    } catch (error) {
        console.error("Validation error:", error);
    }
}

// ============================================
// Validation with Progress Updates
// ============================================

async function validationWithProgress() {
    const kya = await import('./kya_validator_bg.js');

    const manifest = {
        kyaVersion: "1.0",
        agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        proof: []
    };

    const config = {
        mode: "SelfAudit",
        allowed_kya_versions: ["1.0"],
        required_fields: [],
        enforce_controller_match: true,
        check_external_links: false,
        link_checks: [],
        require_all_proofs: false,
        required_field_pairs: [],
        allowed_controllers: [],
        required_vc_types: [],
        attestation_checks: []
    };

    // Progress callback
    const progressCallback = (progressJson: string) => {
        const progress = JSON.parse(progressJson);
        console.log(`[${progress.percentage}%] ${progress.current_step}`);
    };

    try {
        const result = await kya.validate_manifest_with_progress(
            JSON.stringify(manifest),
            JSON.stringify(config),
            progressCallback
        );

        console.log("✅ Validation complete!");
        const report = JSON.parse(result.report);
        console.log("Result:", report);
    } catch (error) {
        console.error("Validation error:", error);
    }
}

// ============================================
// Batch Validation
// ============================================

async function batchValidation() {
    const kya = await import('./kya_validator_bg.js');

    const manifests = [
        {
            kyaVersion: "1.0",
            agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK1",
            proof: []
        },
        {
            kyaVersion: "1.0",
            agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK2",
            proof: []
        },
        {
            kyaVersion: "1.0",
            agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK3",
            proof: []
        }
    ];

    const config = {
        mode: "SelfAudit",
        allowed_kya_versions: ["1.0"],
        required_fields: [],
        enforce_controller_match: true,
        check_external_links: false,
        link_checks: [],
        require_all_proofs: false,
        required_field_pairs: [],
        allowed_controllers: [],
        required_vc_types: [],
        attestation_checks: []
    };

    try {
        const results = await kya.validate_manifests_batch(
            JSON.stringify(manifests),
            JSON.stringify([config])
        );

        console.log(`✅ Validated ${results.length} manifests`);

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            console.log(`Manifest ${i + 1}:`, result.success ? "✅" : "❌");
            if (!result.success) {
                const report = JSON.parse(result.report);
                console.log("  Errors:", report.schema_errors);
            }
        }
    } catch (error) {
        console.error("Batch validation error:", error);
    }
}

// ============================================
// Async Blockchain Solvency Check
// ============================================

async function checkBlockchainSolvency() {
    const kya = await import('./kya_validator_bg.js');

    const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bE";
    const minBalance = "0xde0b6b3a7640000"; // 1 ETH in wei
    const network = "Ethereum";
    const providerType = "Alchemy";
    const apiKey = "your-api-key-here";

    try {
        const result = await kya.check_solvency_async(
            address,
            minBalance,
            network,
            providerType,
            apiKey
        );

        const solvency = JSON.parse(result);
        console.log("Solvency check result:", solvency);

        if (solvency.meets_minimum) {
            console.log("✅ Address meets minimum balance requirement");
            console.log("Current balance:", solvency.current_balance);
            console.log("Transaction count:", solvency.transaction_count);
        } else {
            console.log("❌ Address does NOT meet minimum balance");
        }
    } catch (error) {
        console.error("Solvency check error:", error);
    }
}

// ============================================
// Async TEE Verification
// ============================================

async function verifyTEE() {
    const kya = await import('./kya_validator_bg.js');

    const quoteBase64 = "base64-encoded-quote-here";
    const teeType = "SGX";
    const mrEnclave = "expected-mr-enclave";
    const mrSigner = "expected-mr-signer";
    const productId = 0;
    const minSvn = 2;

    try {
        const result = await kya.verify_tee_async(
            quoteBase64,
            teeType,
            mrEnclave,
            mrSigner,
            productId,
            minSvn
        );

        const verification = JSON.parse(result);
        console.log("TEE verification result:", verification);

        if (verification.valid) {
            console.log("✅ TEE attestation is valid");
            console.log("MRENCLAVE matches:", verification.mr_enclave_matches);
            console.log("MRSIGNER matches:", verification.mr_signer_matches);
            console.log("Product ID valid:", verification.product_id_valid);
            console.log("SVN valid:", verification.svn_valid);
        } else {
            console.log("❌ TEE attestation is INVALID");
        }
    } catch (error) {
        console.error("TEE verification error:", error);
    }
}

// ============================================
// React Integration with Async Validation
// ============================================

import React, { useState } from 'react';

function AsyncManifestValidator() {
    const [manifest, setManifest] = useState<string>("");
    const [isValidating, setIsValidating] = useState(false);
    const [progress, setProgress] = useState<number>(0);
    const [currentStep, setCurrentStep] = useState<string>("");
    const [result, setResult] = useState<any>(null);

    const handleValidate = async () => {
        setIsValidating(true);
        setProgress(0);
        setResult(null);

        const kya = await import('./kya_validator_bg.js');

        const config = {
            mode: "SelfAudit",
            allowed_kya_versions: ["1.0"],
            required_fields: [],
            enforce_controller_match: true,
            check_external_links: false,
            link_checks: [],
            require_all_proofs: false,
            required_field_pairs: [],
            allowed_controllers: [],
            required_vc_types: [],
            attestation_checks: []
        };

        const progressCallback = (progressJson: string) => {
            const progressData = JSON.parse(progressJson);
            setProgress(progressData.percentage);
            setCurrentStep(progressData.current_step);
        };

        try {
            const validation = await kya.validate_manifest_with_progress(
                manifest,
                JSON.stringify(config),
                progressCallback
            );

            setResult(JSON.parse(validation.report));
        } catch (error) {
            console.error("Validation error:", error);
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div>
            <textarea
                value={manifest}
                onChange={(e) => setManifest(e.target.value)}
                placeholder="Enter manifest JSON..."
                rows={10}
                style={{ width: '100%', marginBottom: '10px' }}
            />
            
            <button
                onClick={handleValidate}
                disabled={isValidating || !manifest}
                style={{ padding: '10px 20px' }}
            >
                {isValidating ? 'Validating...' : 'Validate'}
            </button>

            {isValidating && (
                <div>
                    <p>Progress: {progress}%</p>
                    <p>Current Step: {currentStep}</p>
                </div>
            )}

            {result && (
                <div>
                    <h3>Validation Result</h3>
                    <p>Schema: {result.schema_valid ? "✅" : "❌"}</p>
                    <p>Crypto: {result.crypto_valid ? "✅" : "❌"}</p>
                    <p>TTL: {result.ttl_valid ? "✅" : "❌"}</p>
                    <p>Policy: {result.policy_valid ? "✅" : "❌"}</p>
                </div>
            )}
        </div>
    );
}

// ============================================
// Web Worker Integration
// ============================================

// worker.js
self.onmessage = async (e) => {
    const { manifest, config, type } = e.data;
    const kya = await import('./kya_validator_bg.js');

    try {
        let result;
        switch (type) {
            case 'async':
                result = await kya.validate_manifest_async(manifest, config);
                break;
            case 'batch':
                result = await kya.validate_manifests_batch(manifest, config);
                break;
            default:
                throw new Error(`Unknown validation type: ${type}`);
        }
        self.postMessage({ success: true, result });
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};

// main.js
async function validateInWorker(manifest: string, config: string) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('worker.js');

        worker.postMessage({
            manifest,
            config,
            type: 'async'
        });

        worker.onmessage = (e) => {
            if (e.data.success) {
                resolve(e.data.result);
            } else {
                reject(new Error(e.data.error));
            }
            worker.terminate();
        };

        worker.onerror = (error) => {
            reject(error);
            worker.terminate();
        };
    });
}

// ============================================
// Debounced Validation
// ============================================

function createDebouncedValidator() {
    let timeoutId: number | null = null;

    return async (manifest: string, config: string, delay = 500) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        return new Promise((resolve) => {
            timeoutId = setTimeout(async () => {
                const kya = await import('./kya_validator_bg.js');
                const result = await kya.validate_manifest_async(manifest, config);
                resolve(result);
            }, delay);
        });
    };
}

// Usage
const debouncedValidate = createDebouncedValidator();
debouncedValidate(manifestJson, configJson, 300);

// ============================================
// Error Handling Patterns
// ============================================

async function validationWithErrorHandling() {
    const kya = await import('./kya_validator_bg.js');

    const manifest = { kyaVersion: "1.0", agentId: "...", proof: [] };
    const config = { mode: "SelfAudit", /* ... */ };

    try {
        const result = await kya.validate_manifest_async(
            JSON.stringify(manifest),
            JSON.stringify(config)
        );

        if (result.success) {
            const report = JSON.parse(result.report);
            
            // Check specific validation components
            if (!report.schema_valid) {
                console.warn("Schema validation failed:", report.schema_errors);
            }
            if (!report.crypto_valid) {
                console.warn("Crypto validation failed:", report.crypto_errors);
            }
            if (!report.ttl_valid) {
                console.warn("TTL validation failed:", report.ttl_errors);
            }
            if (!report.policy_valid) {
                console.warn("Policy validation failed:", report.policy_errors);
            }
        } else {
            console.error("Validation failed completely");
        }
    } catch (error) {
        if (error.message.includes("Invalid manifest JSON")) {
            console.error("Invalid JSON format");
        } else if (error.message.includes("Invalid config JSON")) {
            console.error("Invalid configuration");
        } else {
            console.error("Unexpected error:", error);
        }
    }
}

// ============================================
// Performance Optimization
// ============================================

async function optimizedValidation() {
    const kya = await import('./kya_validator_bg.js');

    // Cache the config
    const config = JSON.stringify({
        mode: "SelfAudit",
        allowed_kya_versions: ["1.0"],
        required_fields: [],
        enforce_controller_match: true,
        check_external_links: false,
        link_checks: [],
        require_all_proofs: false,
        required_field_pairs: [],
        allowed_controllers: [],
        required_vc_types: [],
        attestation_checks: []
    });

    // Batch multiple validations
    const manifests = [manifest1, manifest2, manifest3, manifest4, manifest5];
    const results = await kya.validate_manifests_batch(
        JSON.stringify(manifests),
        JSON.stringify([config])
    );

    // Process results
    const validCount = results.filter((r: any) => r.success).length;
    console.log(`✅ ${validCount}/${manifests.length} manifests are valid`);
}

// ============================================
// Export examples
// ============================================

export {
    basicAsyncValidation,
    validationWithProgress,
    batchValidation,
    checkBlockchainSolvency,
    verifyTEE,
    AsyncManifestValidator,
    createDebouncedValidator,
    validationWithErrorHandling,
    optimizedValidation
};
