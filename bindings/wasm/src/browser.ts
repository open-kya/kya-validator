// bindings/wasm/src/browser.ts
// Browser-specific entry point for KYA Validator WASM

import type {
  WasmValidationResult,
  ValidationReport,
  ValidationConfig,
  ValidateOptions,
  KyaManifest,
} from "./types.js";
import { defaultValidationConfig, ValidationError } from "./types.js";

// Type definition for the generated WASM module (browser target)
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
let wasmPromise: Promise<WasmModule> | null = null;

/**
 * Initialize the WASM module for browser use
 * Call this before using any validation functions, or use getWasm() for auto-init
 */
export async function init(): Promise<void> {
  if (wasmModule) return;
  if (wasmPromise) {
    await wasmPromise;
    return;
  }

  wasmPromise = (async () => {
    // Dynamic import for browser target (web)
    // The pkg-web output uses ES modules with init function
    const wasmPath = new URL("../pkg-web/kya_validator.js", import.meta.url);
    const module = await import(wasmPath.href);
    
    // Initialize the WASM module (wasm-bindgen web target pattern)
    if (module.default) {
      await module.default();
    } else if (module.init) {
      await module.init();
    } else if (module.instantiate) {
      // Fallback for different wasm-bindgen output patterns
      const wasmBinary = await fetch(
        new URL("../pkg-web/kya_validator_bg.wasm", import.meta.url)
      ).then((r) => r.arrayBuffer());
      await module.instantiate(wasmBinary);
    }
    
    wasmModule = module as WasmModule;
    return wasmModule;
  })();

  await wasmPromise;
}

/**
 * Get the WASM module, initializing if necessary
 */
async function getWasm(): Promise<WasmModule> {
  if (!wasmModule) {
    await init();
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
export async function validateManifest(
  manifest: KyaManifest | string,
  options?: ValidateOptions
): Promise<ValidationReport> {
  const wasm = await getWasm();
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
export async function validateManifestDefault(
  manifest: KyaManifest | string
): Promise<ValidationReport> {
  const wasm = await getWasm();
  const manifestJson = typeof manifest === "string" ? manifest : JSON.stringify(manifest);

  const result = wasm.validate_manifest_default(manifestJson);
  return parseReport(result.report);
}

/**
 * Get the default validation configuration
 * @returns Default ValidationConfig object
 */
export async function getDefaultConfig(): Promise<ValidationConfig> {
  const wasm = await getWasm();
  const configJson = wasm.get_default_config();
  return JSON.parse(configJson);
}

/**
 * Check if a string is valid JSON
 * @param input - String to check
 */
export async function isValidJson(input: string): Promise<boolean> {
  const wasm = await getWasm();
  return wasm.is_valid_json(input);
}

/**
 * Format JSON string with pretty printing
 * @param input - JSON string to format
 */
export async function formatJson(input: string): Promise<string> {
  const wasm = await getWasm();
  return wasm.format_json(input);
}

/**
 * Get validator version
 */
export async function getVersion(): Promise<string> {
  const wasm = await getWasm();
  return wasm.get_version();
}

/**
 * Get validator name
 */
export async function getName(): Promise<string> {
  const wasm = await getWasm();
  return wasm.get_name();
}

/**
 * Parse validation report JSON string
 */
function parseReport(reportJson: string): ValidationReport {
  return JSON.parse(reportJson) as ValidationReport;
}

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
