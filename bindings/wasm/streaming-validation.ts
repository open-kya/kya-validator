/**
 * KYA Validator - Streaming Validation Examples
 * Memory-efficient validation for large manifests
 */

// ============================================
// Basic Streaming Validation
// ============================================

function basicStreamingValidation() {
    const { 
        StreamingValidator, 
        ValidationConfig,
        StreamingOptions 
    } = require('./kya_validator');

    const config = new ValidationConfig({
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

    const validator = new StreamingValidator(config);

    // Add manifest in chunks
    const chunk1 = '{"kyaVersion": "1.0",';
    const chunk2 = '"agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",';
    const chunk3 = '"proof": []}';

    const progress1 = validator.addChunk(chunk1);
    console.log(`Progress: ${progress1.percentage}%`);

    const progress2 = validator.addChunk(chunk2);
    console.log(`Progress: ${progress2.percentage}%`);

    const progress3 = validator.addChunk(chunk3);
    console.log(`Progress: ${progress3.percentage}%`);

    // Finish validation
    const report = validator.finish();
    console.log("Validation complete:", report);
}

// ============================================
// Streaming from File
// ============================================

async function validateFromFile(filePath: string) {
    const fs = require('fs');
    const { 
        validateFromChunks, 
        ValidationConfig 
    } = require('./kya_validator');

    const config = new ValidationConfig({
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

    // Create read stream
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });

    // Validate with progress callback
    const report = await validateFromChunks(
        fileStream,
        config,
        null, // default options
        (progress) => {
            console.log(`[${progress.percentage}%] Step: ${progress.currentStep}`);
            console.log(`  Chunk: ${progress.chunkIndex}/${progress.totalChunks}`);
            if (progress.errorsFound > 0) {
                console.log(`  ⚠️ Errors found: ${progress.errorsFound}`);
            }
        }
    );

    console.log("Validation result:", report);
}

// ============================================
// Streaming from String Chunks
// ============================================

function validateFromStringChunks() {
    const { 
        validateFromStringChunks, 
        ValidationConfig,
        StreamingOptions 
    } = require('./kya_validator');

    const config = new ValidationConfig({
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

    const options = new StreamingOptions({
        maxMemoryBytes: 5 * 1024 * 1024, // 5MB limit
        earlyTermination: true,
        chunkSize: 2048 // 2KB chunks
    });

    const largeManifest = JSON.stringify({
        kyaVersion: "1.0",
        agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        proof: []
    });

    const report = validateFromStringChunks(
        largeManifest,
        config,
        options,
        (progress) => {
            console.log(`Progress: ${progress.percentage}%`);
        }
    );

    console.log("Validation complete:", report);
}

// ============================================
// Memory-Limited Validation
// ============================================

function validateWithMemoryLimit() {
    const { 
        StreamingValidator, 
        ValidationConfig,
        StreamingOptions 
    } = require('./kya_validator');

    const config = new ValidationConfig({
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

    const options = new StreamingOptions({
        maxMemoryBytes: 1024 * 1024, // 1MB limit
        earlyTermination: true,
        chunkSize: 1024 // 1KB chunks
    });

    const validator = new StreamingValidator(config, options);

    // Add chunks
    const chunks = [
        '{"kyaVersion": "1.0",',
        '"agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",',
        '"proof": []}'
    ];

    try {
        for (const chunk of chunks) {
            const progress = validator.addChunk(chunk);
            console.log(`Memory used: ${validator.getMemoryStats().currentMemoryBytes} bytes`);
            console.log(`Progress: ${progress.percentage}%`);
        }

        const report = validator.finish();
        console.log("Validation complete:", report);
    } catch (error) {
        if (error.message.includes("Memory limit exceeded")) {
            console.error("❌ Memory limit exceeded!");
            console.error("Consider increasing maxMemoryBytes or using smaller chunks");
        } else {
            console.error("Validation error:", error);
        }
    }
}

// ============================================
// Early Termination on Errors
// ============================================

function validateWithEarlyTermination() {
    const { 
        StreamingValidator, 
        ValidationConfig,
        StreamingOptions 
    } = require('./kya_validator');

    const config = new ValidationConfig({
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

    const options = new StreamingOptions({
        maxMemoryBytes: 10 * 1024 * 1024,
        earlyTermination: true, // Stop on first error
        chunkSize: 2048
    });

    const validator = new StreamingValidator(config, options);

    // Add chunks
    const chunks = [
        '{"kyaVersion": "1.0",',
        '"agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",',
        '"proof": []}'
    ];

    for (const chunk of chunks) {
        const progress = validator.addChunk(chunk);
        
        if (validator.shouldTerminate()) {
            console.log("⚠️ Early termination triggered!");
            console.log(`Errors found: ${progress.errorsFound}`);
            break;
        }
        
        console.log(`Progress: ${progress.percentage}%`);
    }

    // If we didn't terminate early, finish validation
    if (!validator.shouldTerminate()) {
        const report = validator.finish();
        console.log("Validation complete:", report);
    }
}

// ============================================
// React Integration with Streaming
// ============================================

import React, { useState } from 'react';

interface StreamingValidatorState {
    progress: number;
    currentStep: string;
    errorsFound: number;
    isValidating: boolean;
    result: any;
}

function StreamingManifestValidator() {
    const [state, setState] = useState<StreamingValidatorState>({
        progress: 0,
        currentStep: '',
        errorsFound: 0,
        isValidating: false,
        result: null
    });
    const [manifest, setManifest] = useState("");

    const handleValidate = async () => {
        setState(prev => ({ ...prev, isValidating: true, progress: 0 }));

        const { validateFromStringChunks, ValidationConfig } = await import('./kya_validator');

        const config = new ValidationConfig({
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

        try {
            const report = validateFromStringChunks(
                manifest,
                config,
                null,
                (progress) => {
                    setState(prev => ({
                        ...prev,
                        progress: progress.percentage,
                        currentStep: progress.currentStep,
                        errorsFound: progress.errorsFound
                    }));
                }
            );

            setState(prev => ({ ...prev, result: report, isValidating: false }));
        } catch (error) {
            console.error("Validation error:", error);
            setState(prev => ({ ...prev, isValidating: false }));
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>Streaming Manifest Validator</h2>
            
            <textarea
                value={manifest}
                onChange={(e) => setManifest(e.target.value)}
                placeholder="Enter manifest JSON..."
                rows={10}
                style={{ 
                    width: '100%', 
                    marginBottom: '10px',
                    fontFamily: 'monospace'
                }}
            />
            
            <button
                onClick={handleValidate}
                disabled={state.isValidating || !manifest}
                style={{ padding: '10px 20px' }}
            >
                {state.isValidating ? 'Validating...' : 'Validate'}
            </button>

            {state.isValidating && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Validation Progress</h3>
                    <div style={{ 
                        width: '100%', 
                        height: '20px', 
                        backgroundColor: '#e0e0e0',
                        borderRadius: '5px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${state.progress}%`,
                            height: '100%',
                            backgroundColor: '#4CAF50',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <p>Progress: {state.progress}%</p>
                    <p>Current Step: {state.currentStep}</p>
                    {state.errorsFound > 0 && (
                        <p style={{ color: 'red' }}>
                            Errors found: {state.errorsFound}
                        </p>
                    )}
                </div>
            )}

            {state.result && !state.isValidating && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Validation Result</h3>
                    <p>Schema: {state.result.schemaValid ? "✅" : "❌"}</p>
                    <p>Crypto: {state.result.cryptoValid ? "✅" : "❌"}</p>
                    <p>TTL: {state.result.ttlValid ? "✅" : "❌"}</p>
                    <p>Policy: {state.result.policyValid ? "✅" : "❌"}</p>
                </div>
            )}
        </div>
    );
}

// ============================================
// Batch Streaming Validation
// ============================================

async function batchStreamingValidation(manifests: string[]) {
    const { 
        validateFromStringChunks, 
        ValidationConfig 
    } = require('./kya_validator');

    const config = new ValidationConfig({
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

    const results = [];

    for (let i = 0; i < manifests.length; i++) {
        console.log(`\nValidating manifest ${i + 1}/${manifests.length}...`);
        
        const report = await validateFromStringChunks(
            manifests[i],
            config,
            null,
            (progress) => {
                console.log(`  [${progress.percentage}%] ${progress.currentStep}`);
            }
        );

        results.push(report);
    }

    const validCount = results.filter(r => r.schemaValid).length;
    console.log(`\n✅ ${validCount}/${manifests.length} manifests are valid`);

    return results;
}

// ============================================
// JSON Pointer Navigation
// ============================================

function validateWithJsonPointer() {
    const { validateWithJsonPointer, ValidationConfig } = require('./kya_validator');

    const config = new ValidationConfig({
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

    const manifest = {
        kyaVersion: "1.0",
        agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        proof: [
            { type: "Ed25519", verificationMethod: "did:key:z6Mk...#key-1" },
            { type: "Secp256k1", verificationMethod: "did:pkh:eth:0x123...#key-2" }
        ]
    };

    try {
        // Navigate to proof array
        const proofValue = validateWithJsonPointer(manifest, "/proof", config);
        console.log("Proof array:", proofValue);

        // Navigate to first proof's type
        const firstProofType = validateWithJsonPointer(manifest, "/proof/0/type", config);
        console.log("First proof type:", firstProofType);

        // Navigate to agentId
        const agentId = validateWithJsonPointer(manifest, "/agentId", config);
        console.log("Agent ID:", agentId);
    } catch (error) {
        console.error("JSON pointer error:", error.message);
    }
}

// ============================================
// Memory Statistics
// ============================================

function trackMemoryUsage() {
    const { StreamingValidator, ValidationConfig } = require('./kya_validator');

    const config = new ValidationConfig({
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

    const validator = new StreamingValidator(config);

    const chunks = [
        '{"kyaVersion": "1.0",',
        '"agentId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",',
        '"proof": []}'
    ];

    console.log("Initial memory:", validator.getMemoryStats());

    for (const chunk of chunks) {
        validator.addChunk(chunk);
        const stats = validator.getMemoryStats();
        console.log(`After chunk: ${stats.currentMemoryBytes} bytes, ${stats.chunkCount} chunks`);
    }

    console.log("Final memory:", validator.getMemoryStats());
}

// ============================================
// Error Handling
// ============================================

function validateWithErrorHandling() {
    const { StreamingValidator, ValidationConfig } = require('./kya_validator');

    const config = new ValidationConfig({
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

    const validator = new StreamingValidator(config);

    try {
        // Add valid chunk
        validator.addChunk('{"kyaVersion": "1.0",');
        
        // Add invalid JSON (will cause error on finish)
        validator.addChunk('invalid json');

        const report = validator.finish();
        console.log("Report:", report);
    } catch (error) {
        if (error.message.includes("Invalid JSON")) {
            console.error("❌ Invalid JSON detected");
            console.error("Error:", error.message);
        } else if (error.message.includes("Memory limit")) {
            console.error("❌ Memory limit exceeded");
            console.error("Consider increasing maxMemoryBytes");
        } else {
            console.error("❌ Unexpected error:", error.message);
        }
    }
}

// ============================================
// Performance Optimization
// ============================================

function optimizedStreamingValidation() {
    const { 
        StreamingValidator, 
        ValidationConfig,
        StreamingOptions 
    } = require('./kya_validator');

    const config = new ValidationConfig({
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

    // Optimized options
    const options = new StreamingOptions({
        maxMemoryBytes: 10 * 1024 * 1024, // 10MB
        earlyTermination: true, // Stop on errors
        chunkSize: 8192 // 8KB chunks (larger = faster)
    });

    const validator = new StreamingValidator(config, options);

    const largeManifest = JSON.stringify({
        kyaVersion: "1.0",
        agentId: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        proof: []
    });

    // Optimize: pre-allocate chunks
    const chunkSize = options.chunkSize;
    for (let i = 0; i < largeManifest.length; i += chunkSize) {
        const chunk = largeManifest.substring(i, i + chunkSize);
        validator.addChunk(chunk);
    }

    const report = validator.finish();
    console.log("Validation complete:", report);
}

// ============================================
// Export examples
// ============================================

export {
    basicStreamingValidation,
    validateFromFile,
    validateFromStringChunks,
    validateWithMemoryLimit,
    validateWithEarlyTermination,
    StreamingManifestValidator,
    batchStreamingValidation,
    validateWithJsonPointer,
    trackMemoryUsage,
    validateWithErrorHandling,
    optimizedStreamingValidation
};
