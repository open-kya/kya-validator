// bindings/wasm/src/node.ts
// Node.js-specific entry point for KYA Validator WASM

import { createRequire } from "module";
import type {
  WasmValidationResult,
  ValidationReport,
  ValidationConfig,
  ValidateOptions,
  KyaManifest,
} from "./types.js";
import { defaultValidationConfig, ValidationError } from "./types.js";

// Use createRequire for loading CommonJS WASM module in Node.js
const require = createRequire(import.meta.url);

// Type definition for the generated WASM module (nodejs target)
interface WasmModule {
  validate_manifest: (manifestJson: string, configJson: string) => WasmValidationResult;
  validate_manifest_default: (manifestJson: string) => WasmValidationResult;
  get_default_config: () => string;
  is_valid_json: (input: string) => boolean;
  format_json: (input: string) => string;
  get_version: () => string;
  get_name: () => string;
}

let wasmModule: WasmModule | null = null;

/**
 * Initialize the WASM module for Node.js use
 * This is called automatically on first validation
 */
export function init(): void {
  if (wasmModule) return;
  
  // Load the Node.js target WASM module
  // The pkg-node output uses CommonJS with automatic initialization
  wasmModule = require("../pkg-node/kya_validator.js") as WasmModule;
}

/**
 * Get the WASM module, initializing if necessary
 */
function getWasm(): WasmModule {
  if (!wasmModule) {
    init();
  }
  return wasmModule!;
}

/**
 * Check if WASM module is initialized
 */
export function isInitialized(): boolean {
  return wasmModule !== null;
}

/**
 * Validate a KYA manifest with optional configuration
 * @param manifest - The manifest object or JSON string
 * @param options - Validation options
 * @returns Parsed validation report
 */
export function validateManifest(
  manifest: KyaManifest | string,
  options?: ValidateOptions
): ValidationReport {
  const wasm = getWasm();
  const manifestJson = typeof manifest === "string" ? manifest : JSON.stringify(manifest);
  const config = options?.config ?? defaultValidationConfig;

  const result = wasm.validate_manifest(manifestJson, JSON.stringify(config));
  const report = parseReport(result.report);

  if (options?.throwOnFailure && !result.success) {
    throw new ValidationError("Manifest validation failed", report);
  }

  return report;
}

/**
 * Validate a KYA manifest with default configuration
 * @param manifest - The manifest object or JSON string
 * @returns Parsed validation report
 */
export function validateManifestDefault(
  manifest: KyaManifest | string
): ValidationReport {
  const wasm = getWasm();
  const manifestJson = typeof manifest === "string" ? manifest : JSON.stringify(manifest);

  const result = wasm.validate_manifest_default(manifestJson);
  return parseReport(result.report);
}

/**
 * Get the default validation configuration
 * @returns Default ValidationConfig object
 */
export function getDefaultConfig(): ValidationConfig {
  const wasm = getWasm();
  const configJson = wasm.get_default_config();
  return JSON.parse(configJson);
}

/**
 * Check if a string is valid JSON
 * @param input - String to check
 */
export function isValidJson(input: string): boolean {
  const wasm = getWasm();
  return wasm.is_valid_json(input);
}

/**
 * Format JSON string with pretty printing
 * @param input - JSON string to format
 */
export function formatJson(input: string): string {
  const wasm = getWasm();
  return wasm.format_json(input);
}

/**
 * Get validator version
 */
export function getVersion(): string {
  const wasm = getWasm();
  return wasm.get_version();
}

/**
 * Get validator name
 */
export function getName(): string {
  const wasm = getWasm();
  return wasm.get_name();
}

/**
 * Parse validation report JSON string
 */
function parseReport(reportJson: string): ValidationReport {
  return JSON.parse(reportJson) as ValidationReport;
}

// Sync initialization check helper
function ensureInit(): void {
  if (!wasmModule) {
    init();
  }
}

// Auto-initialize for convenience (Node.js can do sync init)
// This allows using the module without explicit init() call
ensureInit();

// Re-export types
export type {
  WasmValidationResult,
  ValidationReport,
  ValidationConfig,
  ValidateOptions,
  KyaManifest,
  LinkCheckConfig,
  AttestationCheckConfig,
  ValidationMode,
} from "./types.js";

export { defaultValidationConfig } from "./types.js";
