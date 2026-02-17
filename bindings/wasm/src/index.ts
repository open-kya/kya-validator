// bindings/wasm/src/index.ts
// Main entry point for KYA Validator WASM bindings
// Auto-detects environment and exports appropriate API

import type {
  WasmValidationResult,
  ValidationReport,
  ValidationConfig,
  ValidateOptions,
  KyaManifest,
  LinkCheckConfig,
  AttestationCheckConfig,
  ValidationMode,
} from "./types.js";

export type {
  WasmValidationResult,
  ValidationReport,
  ValidationConfig,
  ValidateOptions,
  KyaManifest,
  LinkCheckConfig,
  AttestationCheckConfig,
  ValidationMode,
};

export { defaultValidationConfig, ValidationError } from "./types.js";

// Environment detection
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

/**
 * Validate a KYA manifest with optional configuration
 * Browser: Returns Promise<ValidationReport> (async)
 * Node.js: Returns ValidationReport (sync)
 * 
 * @param manifest - The manifest object or JSON string
 * @param options - Validation options
 * @returns Validation report (Promise in browser, direct in Node.js)
 */
export function validateManifest(
  manifest: KyaManifest | string,
  options?: ValidateOptions
): ValidationReport | Promise<ValidationReport> {
  if (isBrowser) {
    // Dynamic import for browser to enable code splitting
    return import("./browser.js").then((m) => m.validateManifest(manifest, options));
  } else if (isNode) {
    // Sync import for Node.js
    const { validateManifest: validate } = require("./node.js");
    return validate(manifest, options);
  }
  throw new Error("Unsupported environment: neither browser nor Node.js detected");
}

/**
 * Validate a KYA manifest with default configuration
 * Browser: Returns Promise<ValidationReport> (async)
 * Node.js: Returns ValidationReport (sync)
 * 
 * @param manifest - The manifest object or JSON string
 * @returns Validation report
 */
export function validateManifestDefault(
  manifest: KyaManifest | string
): ValidationReport | Promise<ValidationReport> {
  if (isBrowser) {
    return import("./browser.js").then((m) => m.validateManifestDefault(manifest));
  } else if (isNode) {
    const { validateManifestDefault: validate } = require("./node.js");
    return validate(manifest);
  }
  throw new Error("Unsupported environment: neither browser nor Node.js detected");
}

/**
 * Get the default validation configuration
 * Browser: Returns Promise<ValidationConfig>
 * Node.js: Returns ValidationConfig (sync)
 */
export function getDefaultConfig(): ValidationConfig | Promise<ValidationConfig> {
  if (isBrowser) {
    return import("./browser.js").then((m) => m.getDefaultConfig());
  } else if (isNode) {
    const { getDefaultConfig: getConfig } = require("./node.js");
    return getConfig();
  }
  throw new Error("Unsupported environment: neither browser nor Node.js detected");
}

/**
 * Check if a string is valid JSON
 * Browser: Returns Promise<boolean>
 * Node.js: Returns boolean (sync)
 */
export function isValidJson(input: string): boolean | Promise<boolean> {
  if (isBrowser) {
    return import("./browser.js").then((m) => m.isValidJson(input));
  } else if (isNode) {
    const { isValidJson: check } = require("./node.js");
    return check(input);
  }
  throw new Error("Unsupported environment: neither browser nor Node.js detected");
}

/**
 * Format JSON string with pretty printing
 * Browser: Returns Promise<string>
 * Node.js: Returns string (sync)
 */
export function formatJson(input: string): string | Promise<string> {
  if (isBrowser) {
    return import("./browser.js").then((m) => m.formatJson(input));
  } else if (isNode) {
    const { formatJson: format } = require("./node.js");
    return format(input);
  }
  throw new Error("Unsupported environment: neither browser nor Node.js detected");
}

/**
 * Get validator version
 * Browser: Returns Promise<string>
 * Node.js: Returns string (sync)
 */
export function getVersion(): string | Promise<string> {
  if (isBrowser) {
    return import("./browser.js").then((m) => m.getVersion());
  } else if (isNode) {
    const { getVersion: version } = require("./node.js");
    return version();
  }
  throw new Error("Unsupported environment: neither browser nor Node.js detected");
}

/**
 * Get validator name
 * Browser: Returns Promise<string>
 * Node.js: Returns string (sync)
 */
export function getName(): string | Promise<string> {
  if (isBrowser) {
    return import("./browser.js").then((m) => m.getName());
  } else if (isNode) {
    const { getName: name } = require("./node.js");
    return name();
  }
  throw new Error("Unsupported environment: neither browser nor Node.js detected");
}

/**
 * Check if WASM module is initialized
 * Browser: Returns Promise<boolean>
 * Node.js: Returns boolean (sync)
 */
export function isInitialized(): boolean | Promise<boolean> {
  if (isBrowser) {
    return import("./browser.js").then((m) => m.isInitialized());
  } else if (isNode) {
    const { isInitialized: check } = require("./node.js");
    return check();
  }
  return false;
}

/**
 * Initialize WASM module (only needed for browser)
 * Node.js initializes automatically
 */
export async function init(): Promise<void> {
  if (isBrowser) {
    const { init: browserInit } = await import("./browser.js");
    await browserInit();
  } else if (isNode) {
    const { init: nodeInit } = require("./node.js");
    nodeInit();
  }
}

// Export environment detection for consumers
export const environment = {
  isBrowser,
  isNode,
};

// Named re-exports for explicit environment selection
export { validateManifest as validateManifestBrowser, getDefaultConfig as getDefaultConfigBrowser, isValidJson as isValidJsonBrowser, formatJson as formatJsonBrowser, getVersion as getVersionBrowser, getName as getNameBrowser, init as initBrowser, isInitialized as isInitializedBrowser } from "./browser.js";
export { validateManifest as validateManifestNode, getDefaultConfig as getDefaultConfigNode, isValidJson as isValidJsonNode, formatJson as formatJsonNode, getVersion as getVersionNode, getName as getNameNode, init as initNode, isInitialized as isInitializedNode } from "./node.js";
