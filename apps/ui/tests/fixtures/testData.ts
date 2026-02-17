/**
 * Test fixtures and mock data for KYA Policy Editor UI tests
 */

/**
 * Sample valid KYA manifest
 */
export const sampleManifest = {
  kyaVersion: '1.0',
  agentId: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
  verificationMethod: '#key-1',
  proof: [
    {
      type: 'Ed25519Signature2020',
      created: '2024-01-26T12:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: '#key-1',
      challenge: '2a2b2c',
      domain: 'example.com',
      jws: 'eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIiwia2lkIjoiemZ2TzN0RzZvMz...mock',
    },
  ],
  issuanceDate: '2024-01-26T12:00:00Z',
  expirationDate: '2024-02-26T12:00:00Z',
};

/**
 * Sample valid policy
 */
export const samplePolicy = {
  id: 'test-policy-1',
  name: 'Test Policy',
  version: '1.0.0',
  description: 'A test policy for E2E testing',
  rules: [
    {
      id: 'rule-1',
      type: 'schema',
      name: 'Schema Validation',
      description: 'Validate manifest schema',
      enabled: true,
      parameters: {
        schemaVersion: '1.0',
      },
      order: 0,
    },
    {
      id: 'rule-2',
      type: 'crypto',
      name: 'Crypto Check',
      description: 'Verify signature',
      enabled: true,
      parameters: {
        requireSignature: true,
      },
      order: 1,
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * DID Resolution Mock Response
 */
export const didResolutionMock = {
  context: 'https://w3id.org/did-resolution/v1',
  didDocument: {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
    verificationMethod: [
      {
        id: '#key-1',
        type: 'Ed25519VerificationKey2020',
        controller: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
        publicKeyBase58: '3z5Wakf62mbqMtmJSpHfGBu2uPiUYyTgt6yprVY3uR',
      },
    ],
  },
};

/**
 * Blockchain Balance Mock Response
 */
export const blockchainBalanceMock = {
  jsonrpc: '2.0',
  id: 1,
  result: '0x56bc75e2d63000000', // 100 ETH in wei
};

/**
 * TEE Attestation Mock Response
 */
export const teeAttestationMock = {
  version: 3,
  attestation_type: 'SGX_ECDSA',
  quote: 'mock-quote-data',
  certificate_chain: ['mock-cert-1', 'mock-cert-2'],
};

/**
 * Validation Report Mock
 */
export const validationReportMock = {
  valid: true,
  schemaErrors: [],
  ttlErrors: [],
  cryptoErrors: [],
  inspectorErrors: [],
  policyErrors: [],
  totalErrors: 0,
};

/**
 * Policy presets for testing
 */
export const testPresets = [
  {
    id: 'basic',
    name: 'Basic Validation',
    description: 'Essential validation rules',
    rules: 3,
  },
  {
    id: 'strict',
    name: 'Strict Security',
    description: 'Comprehensive security validation',
    rules: 5,
  },
  {
    id: 'financial',
    name: 'Financial Services',
    description: 'Financial-grade validation',
    rules: 4,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Enterprise-grade validation',
    rules: 6,
  },
  {
    id: 'development',
    name: 'Development',
    description: 'Relaxed validation for testing',
    rules: 2,
  },
];

/**
 * Rule types for testing
 */
export const ruleTypes = [
  'schema',
  'ttl',
  'crypto',
  'tee',
  'solvency',
  'region',
  'transaction_value',
  'time_window',
  'custom',
];

/**
 * Invalid manifest for negative testing
 */
export const invalidManifest = {
  kyaVersion: 'invalid-version',
  agentId: 'invalid-did',
  proof: [],
};

/**
 * Expired manifest for TTL testing
 */
export const expiredManifest = {
  ...sampleManifest,
  issuanceDate: '2023-01-01T12:00:00Z',
  expirationDate: '2023-02-01T12:00:00Z',
};

/**
 * Manifest that fails Strict Security Policy
 *
 * This manifest is designed to fail validation against the Strict Security Policy
 * because it lacks required TEE evidence and has other issues:
 * - Missing TEE attestation evidence (required by Strict Security)
 * - Missing proper cryptographic signature
 * - The proof only contains VerificationMethod type without actual signature
 * - No geographic region information
 */
export const strictSecurityFailManifest = {
  kyaVersion: '1.0',
  agentId: 'did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK',
  issuanceDate: '2026-01-27T03:23:26.175Z',
  expirationDate: '2026-01-28T03:23:26.176Z',
  verificationMethod: 'did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK',
  proof: [
    {
      type: 'VerificationMethod',
      proofPurpose: 'authentication',
      challenge: 'KYA-2026-challenge',
    },
  ],
};

/**
 * Manifest that fails Enterprise Policy solvency requirement
 *
 * This manifest is designed to fail validation against the Enterprise Policy
 * because it lacks required solvency information:
 * - Missing solvencyInfo (required by Enterprise)
 */
export const enterpriseSolvencyFailManifest = {
  kyaVersion: '1.0',
  agentId: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
  verificationMethod: '#key-1',
  proof: [
    {
      type: 'Ed25519Signature2020',
      created: '2024-01-26T12:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: '#key-1',
      challenge: '2a2b2c',
      domain: 'example.com',
      jws: 'eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIiwia2lkIjoiemZ2TzN0RzZvMz...mock',
    },
  ],
  issuanceDate: '2024-01-26T12:00:00Z',
  expirationDate: '2024-02-26T12:00:00Z',
};

/**
 * Manifest that fails Strict Security Policy region restriction
 *
 * This manifest is designed to fail validation against the Strict Security Policy
 * because it contains a region from a forbidden country:
 * - Region is set to "CN" (China), which is in the forbidden list
 * - Strict Security Policy permits: US, EU, CA
 * - Strict Security Policy forbids: CN, RU
 */
export const regionFailManifest = {
  kyaVersion: '1.0',
  agentId: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
  verificationMethod: '#key-1',
  proof: [
    {
      type: 'Ed25519Signature2020',
      created: '2024-01-26T12:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: '#key-1',
      challenge: '2a2b2c',
      domain: 'example.com',
      jws: 'eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIiwia2lkIjoiemZ2TzN0RzZvMz...mock',
    },
  ],
  issuanceDate: '2024-01-26T12:00:00Z',
  expirationDate: '2024-02-26T12:00:00Z',
  region: 'CN',
};

/**
 * Manifest that fails Financial Services Policy transaction value limit
 *
 * This manifest is designed to fail validation against the Financial Services Policy
 * because it exceeds the maximum transaction value:
 * - Transaction value is set to 15000 USD, which exceeds the max of 10000
 * - Financial Services Policy: maxValue: 10000, minValue: 0.01
 */
export const transactionValueFailManifest = {
  kyaVersion: '1.0',
  agentId: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
  verificationMethod: '#key-1',
  proof: [
    {
      type: 'Secp256k1VerificationKey2020',
      created: '2024-01-26T12:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: '#key-1',
      challenge: '2a2b2c',
      domain: 'example.com',
      jws: 'eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIiwia2lkIjoiemZ2TzN0RzZvMz...mock',
    },
  ],
  issuanceDate: '2024-01-26T12:00:00Z',
  expirationDate: '2024-02-26T12:00:00Z',
  transactionValue: 15000,
};

/**
 * Manifest that fails time window restrictions
 *
 * This manifest is designed to fail validation against policies with time window rules:
 * - Issuance date is set to a specific time that may fall outside allowed hours
 * - Policies with time_window rules check allowedHours and allowedDays
 * - This manifest can be used to test time-based validation
 */
export const timeWindowFailManifest = {
  kyaVersion: '1.0',
  agentId: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
  verificationMethod: '#key-1',
  proof: [
    {
      type: 'Ed25519Signature2020',
      created: '2024-01-26T03:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: '#key-1',
      challenge: '2a2b2c',
      domain: 'example.com',
      jws: 'eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIiwia2lkIjoiemZ2TzN0RzZvMz...mock',
    },
  ],
  issuanceDate: '2024-01-26T03:00:00Z',
  expirationDate: '2024-02-26T03:00:00Z',
};

/**
 * Manifest that fails cryptographic algorithm restrictions
 *
 * This manifest is designed to fail validation against policies with crypto algorithm restrictions:
 * - Uses "RSASignature2020" which is not in the allowed algorithms list
 * - Strict Security Policy allows: Ed25519, Secp256k1
 * - Financial Services Policy allows: Secp256k1
 * - Enterprise Policy allows: Ed25519, Secp256k1
 */
export const cryptoFailManifest = {
  kyaVersion: '1.0',
  agentId: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
  verificationMethod: '#key-1',
  proof: [
    {
      type: 'RSASignature2020',
      created: '2024-01-26T12:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: '#key-1',
      challenge: '2a2b2c',
      domain: 'example.com',
      jws: 'eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIiwia2lkIjoiemZ2TzN0RzZvMz...mock',
    },
  ],
  issuanceDate: '2024-01-26T12:00:00Z',
  expirationDate: '2024-02-26T12:00:00Z',
};
