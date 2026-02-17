/**
 * JavaScript Validator Module for KYA Manifests
 * 
 * This module provides validation capabilities for Web UI.
 * It handles schema validation, TTL checks, policy-based validation,
 * and rule-specific checks (TEE, solvency, region, crypto, transaction value).
 * Network operations (external link checks, DID resolution) are handled
 * by browser fetch APIs.
 */

import { Policy } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  // Categorized errors for policy-specific rules
  policyErrors: PolicyValidationErrors;
}

export interface PolicyValidationErrors {
  schemaErrors: string[];
  ttlErrors: string[];
  cryptoErrors: string[];
  teeErrors: string[];
  solvencyErrors: string[];
  regionErrors: string[];
  transactionValueErrors: string[];
  otherErrors: string[];
}

export interface Manifest {
  kyaVersion: string;
  agentId: string;
  issuanceDate?: string;
  expirationDate?: string;
  verifiableCredential?: any[];
  proof?: any[];
  verificationMethod?: string;
  teeEvidence?: any[];
  solvencyInfo?: any;
  region?: string;
  transactionValue?: number;
  [key: string]: any;
}

export interface ValidationConfig {
  allowIssuanceDateInFuture?: boolean;
  allowExpirationDateInPast?: boolean;
  allowedKyaVersions?: string[];
  maxAge?: number; // Maximum age in hours
}

/**
 * Validate a KYA manifest against a policy
 */
export async function validateManifest(
  manifest: Manifest,
  policy?: Policy,
  config: ValidationConfig = {}
): Promise<ValidationResult> {
  const policyErrors: PolicyValidationErrors = {
    schemaErrors: [],
    ttlErrors: [],
    cryptoErrors: [],
    teeErrors: [],
    solvencyErrors: [],
    regionErrors: [],
    transactionValueErrors: [],
    otherErrors: [],
  };
  const warnings: string[] = [];

  // 1. Schema validation
  const schemaValidation = validateSchema(manifest);
  policyErrors.schemaErrors.push(...schemaValidation.errors);
  warnings.push(...schemaValidation.warnings);

  // 2. TTL validation
  const ttlValidation = validateTTL(manifest, config);
  if (!ttlValidation.valid) {
    policyErrors.ttlErrors.push(...ttlValidation.errors);
  }

  // 3. Required fields
  const requiredFields = checkRequiredFields(manifest);
  if (!requiredFields.valid) {
    policyErrors.schemaErrors.push(...requiredFields.errors);
  }

  // 4. KYA version check
  if (config.allowedKyaVersions && config.allowedKyaVersions.length > 0) {
    if (!config.allowedKyaVersions.includes(manifest.kyaVersion)) {
      policyErrors.schemaErrors.push(
        `Unsupported KYA version: ${manifest.kyaVersion}. Allowed: ${config.allowedKyaVersions.join(', ')}`
      );
    }
  }

  // 5. Policy-based validation
  if (policy) {
    console.log('[VALIDATOR] Policy passed:', policy.id, 'with', policy.rules.length, 'rules');
    // Sort rules by order
    const sortedRules = [...policy.rules].sort((a, b) => a.order - b.order);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      console.log('[VALIDATOR] Processing rule:', rule.type, rule.name, 'enabled:', rule.enabled, 'params:', rule.parameters);
      switch (rule.type) {
        case 'schema':
          // Schema validation is already done at the top of this function
          // This rule type in policy is for documentation/redundancy
          console.log('[VALIDATOR] Schema rule processed (already validated above)');
          break;
        case 'ttl':
          // TTL validation is already done at the top of this function
          // This rule type in policy is for documentation/redundancy
          console.log('[VALIDATOR] TTL rule processed (already validated above)');
          break;
        case 'crypto':
          const cryptoResult = validateCrypto(manifest, rule);
          policyErrors.cryptoErrors.push(...cryptoResult.errors);
          warnings.push(...cryptoResult.warnings);
          break;
        case 'tee':
          const teeResult = validateTEE(manifest, rule);
          policyErrors.teeErrors.push(...teeResult.errors);
          warnings.push(...teeResult.warnings);
          break;
        case 'solvency':
          const solvencyResult = validateSolvency(manifest, rule);
          policyErrors.solvencyErrors.push(...solvencyResult.errors);
          warnings.push(...solvencyResult.warnings);
          break;
        case 'region':
          const regionResult = validateRegion(manifest, rule);
          policyErrors.regionErrors.push(...regionResult.errors);
          warnings.push(...regionResult.warnings);
          break;
        case 'transaction_value':
          const transactionResult = validateTransactionValue(manifest, rule);
          policyErrors.transactionValueErrors.push(...transactionResult.errors);
          warnings.push(...transactionResult.warnings);
          break;
        case 'time_window':
          const timeWindowResult = validateTimeWindow(manifest, rule);
          policyErrors.ttlErrors.push(...timeWindowResult.errors);
          warnings.push(...timeWindowResult.warnings);
          break;
        case 'custom':
          // Custom rules are not implemented in this validator
          policyErrors.otherErrors.push(`Custom rule '${rule.name}' is not implemented`);
          break;
        default:
          policyErrors.otherErrors.push(`Unknown rule type: ${rule.type}`);
      }
    }
  }

  // Collect all errors
  const allErrors = [
    ...policyErrors.schemaErrors,
    ...policyErrors.ttlErrors,
    ...policyErrors.cryptoErrors,
    ...policyErrors.teeErrors,
    ...policyErrors.solvencyErrors,
    ...policyErrors.regionErrors,
    ...policyErrors.transactionValueErrors,
    ...policyErrors.otherErrors,
  ];

  console.log('[VALIDATOR] Final result - valid:', allErrors.length === 0, 'errors:', allErrors.length, 'teeErrors:', policyErrors.teeErrors, 'solvencyErrors:', policyErrors.solvencyErrors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings,
    policyErrors,
  };
}

/**
 * Validate manifest against JSON Schema
 */
function validateSchema(manifest: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Simple schema validation check
    if (!manifest.kyaVersion) {
      errors.push('Missing required field: kyaVersion');
    }
    if (!manifest.agentId) {
      errors.push('Missing required field: agentId');
    }
    if (!manifest.issuanceDate) {
      errors.push('Missing required field: issuanceDate');
    }
    if (!manifest.expirationDate) {
      errors.push('Missing required field: expirationDate');
    }

    // Note: Full JSON Schema validation would require a library like ajv
    // This is a simplified check for core fields
  } catch (error) {
    errors.push(`Schema validation error: ${error}`);
  }

  return { errors, warnings };
}

/**
 * Validate issuance and expiration dates
 */
function validateTTL(
  manifest: Manifest,
  config: ValidationConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const now = new Date();

  if (manifest.issuanceDate) {
    const issuance = new Date(manifest.issuanceDate);
    if (isNaN(issuance.getTime())) {
      errors.push('Invalid issuanceDate format');
    } else if (
      issuance > now &&
      !config.allowIssuanceDateInFuture
    ) {
      errors.push('issuanceDate is in the future');
    } else {
      // Check maxAge if specified (in hours)
      if (config.maxAge !== undefined && issuance <= now) {
        const ageInHours = (now.getTime() - issuance.getTime()) / (1000 * 60 * 60);
        if (ageInHours > config.maxAge) {
          errors.push(`Manifest age (${ageInHours.toFixed(1)} hours) exceeds maximum allowed age (${config.maxAge} hours)`);
        }
      }
    }
  }

  if (manifest.expirationDate) {
    const expiration = new Date(manifest.expirationDate);
    if (isNaN(expiration.getTime())) {
      errors.push('Invalid expirationDate format');
    } else if (
      expiration < now &&
      !config.allowExpirationDateInPast
    ) {
      errors.push('expirationDate is in the past');
    }
  }

  // Check that expiration is after issuance
  if (manifest.issuanceDate && manifest.expirationDate) {
    const issuance = new Date(manifest.issuanceDate);
    const expiration = new Date(manifest.expirationDate);
    if (expiration <= issuance) {
      errors.push('expirationDate must be after issuanceDate');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check required fields are present
 */
function checkRequiredFields(manifest: Manifest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const requiredFields = [
    'kyaVersion',
    'agentId',
    'issuanceDate',
    'expirationDate',
  ];

  for (const field of requiredFields) {
    if (!(field in manifest) || manifest[field] === undefined || manifest[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate cryptographic requirements
 */
function validateCrypto(manifest: Manifest, rule: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const params = rule.parameters || {};

  // Check if signature is required
  if (params.requireSignature) {
    if (!manifest.proof || manifest.proof.length === 0) {
      errors.push('Cryptographic signature is required but not present');
    } else {
      // Check for valid proof structure
      for (const proof of manifest.proof) {
        if (!proof.type) {
          errors.push('Proof missing required field: type');
        }
        if (!proof.proofPurpose) {
          errors.push('Proof missing required field: proofPurpose');
        }
      }
    }
  }

  // Check verification method
  if (params.requireVerification) {
    if (!manifest.verificationMethod) {
      errors.push('Verification method is required but not present');
    }
  }

  // Check allowed algorithms
  if (params.allowedAlgorithms && manifest.proof) {
    for (const proof of manifest.proof) {
      if (proof.type && !params.allowedAlgorithms.includes(proof.type)) {
        errors.push(`Cryptographic algorithm '${proof.type}' is not allowed. Allowed: ${params.allowedAlgorithms.join(', ')}`);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate TEE (Trusted Execution Environment) evidence
 */
function validateTEE(manifest: Manifest, rule: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const params = rule.parameters || {};

  // Check if TEE is required
  if (params.requireTEE) {
    console.log('[VALIDATOR] TEE required, manifest.teeEvidence:', manifest.teeEvidence);
    if (!manifest.teeEvidence || manifest.teeEvidence.length === 0) {
      errors.push('TEE evidence is required but not present');
    } else {
      // Check for attestation
      if (params.requireAttestation) {
        const hasAttestation = manifest.teeEvidence.some((evidence: any) => 
          evidence.attestation || evidence.quote
        );
        if (!hasAttestation) {
          errors.push('TEE attestation is required but not present in TEE evidence');
        }
      }

      // Check allowed providers
      if (params.allowedProviders) {
        for (const evidence of manifest.teeEvidence) {
          if (evidence.provider && !params.allowedProviders.includes(evidence.provider)) {
            errors.push(`TEE provider '${evidence.provider}' is not allowed. Allowed: ${params.allowedProviders.join(', ')}`);
          }
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate solvency requirements
 */
function validateSolvency(manifest: Manifest, rule: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const params = rule.parameters || {};

  // Check if solvency is required
  if (params.requireSolvency) {
    console.log('[VALIDATOR] Solvency required, manifest.solvencyInfo:', manifest.solvencyInfo);
    if (!manifest.solvencyInfo) {
      errors.push('Solvency information is required but not present');
    } else {
      // Check minimum balance
      if (params.minBalance !== undefined) {
        const balance = manifest.solvencyInfo.balance || manifest.solvencyInfo.amount;
        if (balance === undefined || balance === null) {
          errors.push('Solvency balance/amount is not specified');
        } else if (balance < params.minBalance) {
          errors.push(`Solvency balance (${balance}) is below minimum required (${params.minBalance})`);
        }
      }

      // Check chain
      if (params.chain && manifest.solvencyInfo.chain !== params.chain) {
        errors.push(`Solvency chain '${manifest.solvencyInfo.chain}' does not match required chain '${params.chain}'`);
      }

      // Check provider
      if (params.provider && manifest.solvencyInfo.provider !== params.provider) {
        warnings.push(`Solvency provider '${manifest.solvencyInfo.provider}' differs from preferred provider '${params.chain}'`);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate geographic restrictions
 */
function validateRegion(manifest: Manifest, rule: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const params = rule.parameters || {};

  // Get region from manifest
  const region = manifest.region || manifest.geographicRegion || manifest.jurisdiction;

  if (!region) {
    errors.push('Region information is required but not present');
    return { errors, warnings };
  }

  // Check permitted regions
  if (params.permittedRegions && params.permittedRegions.length > 0) {
    if (!params.permittedRegions.includes(region)) {
      errors.push(`Region '${region}' is not permitted. Allowed regions: ${params.permittedRegions.join(', ')}`);
    }
  }

  // Check forbidden regions
  if (params.forbiddenRegions && params.forbiddenRegions.length > 0) {
    if (params.forbiddenRegions.includes(region)) {
      errors.push(`Region '${region}' is forbidden`);
    }
  }

  return { errors, warnings };
}

/**
 * Validate transaction value limits
 */
function validateTransactionValue(manifest: Manifest, rule: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const params = rule.parameters || {};

  // Check if transaction value is present
  if (manifest.transactionValue === undefined || manifest.transactionValue === null) {
    errors.push('Transaction value is required but not present');
    return { errors, warnings };
  }

  const value = Number(manifest.transactionValue);
  if (isNaN(value)) {
    errors.push('Transaction value must be a valid number');
    return { errors, warnings };
  }

  // Check minimum value
  if (params.minValue !== undefined && value < params.minValue) {
    errors.push(`Transaction value (${value}) is below minimum allowed (${params.minValue} ${params.currency || ''})`);
  }

  // Check maximum value
  if (params.maxValue !== undefined && value > params.maxValue) {
    errors.push(`Transaction value (${value}) exceeds maximum allowed (${params.maxValue} ${params.currency || ''})`);
  }

  return { errors, warnings };
}

/**
 * Validate time window restrictions
 */
function validateTimeWindow(_manifest: Manifest, rule: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const params = rule.parameters || {};

  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Check allowed hours
  if (params.allowedHours && params.allowedHours.length > 0) {
    if (!params.allowedHours.includes(currentHour)) {
      errors.push(`Current hour (${currentHour}) is not within allowed hours: ${params.allowedHours.join(', ')}`);
    }
  }

  // Check allowed days (0 = Sunday, 6 = Saturday)
  if (params.allowedDays && params.allowedDays.length > 0) {
    if (!params.allowedDays.includes(currentDay)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      errors.push(`Current day (${dayNames[currentDay]}) is not within allowed days`);
    }
  }

  return { errors, warnings };
}

/**
 * Format JSON with pretty printing
 */
export function formatJSON(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`);
  }
}

/**
 * Check if string is valid JSON
 */
export function isValidJSON(input: string): boolean {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get default validation configuration
 */
export function getDefaultConfig(): ValidationConfig {
  return {
    allowIssuanceDateInFuture: false,
    allowExpirationDateInPast: false,
    allowedKyaVersions: ['1.0'],
  };
}

/**
 * Get validator version
 */
export function getVersion(): string {
  return '1.0.0';
}
