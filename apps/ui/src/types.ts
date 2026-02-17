// KYA Policy Editor Types

export interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: PolicyRule[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRule {
  id: string;
  type: RuleType;
  name: string;
  description: string;
  enabled: boolean;
  parameters: RuleParameters;
  order: number;
}

export type RuleType =
  | 'schema'
  | 'ttl'
  | 'crypto'
  | 'tee'
  | 'solvency'
  | 'region'
  | 'transaction_value'
  | 'time_window'
  | 'custom';

export interface RuleParameters {
  [key: string]: any;
}

export interface SchemaRuleParams {
  schemaUrl?: string;
  schemaVersion?: string;
}

export interface TTLRuleParams {
  maxAge?: number; // hours
  requireExpiration?: boolean;
}

export interface CryptoRuleParams {
  requireSignature?: boolean;
  allowedAlgorithms?: string[];
  requireVerification?: boolean;
}

export interface TEERuleParams {
  requireTEE?: boolean;
  requireAttestation?: boolean;
  allowedProviders?: string[];
}

export interface SolvencyRuleParams {
  requireSolvency?: boolean;
  minBalance?: number;
  chain?: string;
  provider?: string;
}

export interface RegionRuleParams {
  permittedRegions?: string[];
  forbiddenRegions?: string[];
}

export interface TransactionValueRuleParams {
  maxValue?: number;
  minValue?: number;
  currency?: string;
}

export interface TimeWindowRuleParams {
  allowedHours?: number[];
  allowedDays?: number[];
  timezone?: string;
}

export interface Manifest {
  kyaVersion: string;
  agentId: string;
  verificationMethod: string;
  proof: any[];
  [key: string]: any;
}

export interface ValidationReport {
  valid: boolean;
  schemaErrors: ValidationError[];
  ttlErrors: ValidationError[];
  cryptoErrors: ValidationError[];
  inspectorErrors: ValidationError[];
  policyErrors: ValidationError[];
  totalErrors: number;
}

export interface ValidationError {
  field?: string;
  message: string;
  code?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface PolicyPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  policy: Policy;
}

export type PresetCategory =
  | 'basic'
  | 'strict'
  | 'financial'
  | 'enterprise'
  | 'development';

export interface TestResult {
  policyId: string;
  manifest: Manifest;
  report: ValidationReport;
  timestamp: string;
  duration: number;
}
