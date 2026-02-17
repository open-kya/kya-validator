/**
 * Manifest Presets for Testing
 *
 * These are sample manifests used to test validation.
 * They are decoupled from policy presets - these are DATA to test,
 * not rules for HOW to test.
 */

export interface ManifestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'valid' | 'invalid' | 'edge-case';
  json: string;
}

/**
 * Valid Manifests - These should pass validation
 */
export const validManifests: ManifestTemplate[] = [
  {
    id: 'basic-valid',
    name: 'Basic Valid',
    description: 'Minimal valid manifest with all required fields',
    category: 'valid',
    json: JSON.stringify({
      kyaVersion: "1.0",
      agentId: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: [
        {
          type: "VerificationMethod",
          proofPurpose: "authentication",
          challenge: "KYA-2026-challenge"
        }
      ]
    }, null, 2)
  },
  {
    id: 'future-expiry',
    name: 'Future Expiry',
    description: 'Valid manifest with longer validity period',
    category: 'valid',
    json: JSON.stringify({
      kyaVersion: "1.0",
      agentId: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: []
    }, null, 2)
  }
];

/**
 * Invalid Manifests - These should fail validation
 */
export const invalidManifests: ManifestTemplate[] = [
  {
    id: 'expired',
    name: 'Expired Manifest',
    description: 'Manifest with past expiration date',
    category: 'invalid',
    json: JSON.stringify({
      kyaVersion: "1.0",
      agentId: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      issuanceDate: new Date(Date.now() - 86400000 * 7).toISOString(),
      expirationDate: new Date(Date.now() - 86400000).toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: []
    }, null, 2)
  },
  {
    id: 'future-issuance',
    name: 'Future Issuance',
    description: 'Manifest with issuance date in future',
    category: 'invalid',
    json: JSON.stringify({
      kyaVersion: "1.0",
      agentId: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      issuanceDate: new Date(Date.now() + 86400000).toISOString(),
      expirationDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: []
    }, null, 2)
  },
  {
    id: 'missing-issuance-date',
    name: 'Missing Issuance Date',
    description: 'Manifest without required issuanceDate field',
    category: 'invalid',
    json: JSON.stringify({
      kyaVersion: "1.0",
      agentId: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: []
    }, null, 2)
  },
  {
    id: 'missing-expiration-date',
    name: 'Missing Expiration Date',
    description: 'Manifest without required expirationDate field',
    category: 'invalid',
    json: JSON.stringify({
      kyaVersion: "1.0",
      agentId: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      issuanceDate: new Date().toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: []
    }, null, 2)
  },
  {
    id: 'missing-agent-id',
    name: 'Missing Agent ID',
    description: 'Manifest without required agentId field',
    category: 'invalid',
    json: JSON.stringify({
      kyaVersion: "1.0",
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: []
    }, null, 2)
  }
];

/**
 * Edge Cases - These test specific validation scenarios
 */
export const edgeCaseManifests: ManifestTemplate[] = [
  {
    id: 'wrong-version',
    name: 'Wrong KYA Version',
    description: 'Manifest with unsupported KYA version',
    category: 'edge-case',
    json: JSON.stringify({
      kyaVersion: "0.9",
      agentId: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: []
    }, null, 2)
  },
  {
    id: 'invalid-date-format',
    name: 'Invalid Date Format',
    description: 'Manifest with malformed date string',
    category: 'edge-case',
    json: JSON.stringify({
      kyaVersion: "1.0",
      agentId: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      issuanceDate: "2026-01-27",
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
      verificationMethod: "did:key:z6MkqYF6oW6ohpGVWPG6yTgq4XZK",
      proof: []
    }, null, 2)
  },
  {
    id: 'malformed-json',
    name: 'Malformed JSON',
    description: 'Invalid JSON structure',
    category: 'edge-case',
    json: 'not a valid json at all'
  }
];

/**
 * All manifest presets combined
 */
export const manifestPresets: ManifestTemplate[] = [
  ...validManifests,
  ...invalidManifests,
  ...edgeCaseManifests
];

/**
 * Get manifest presets by category
 */
export function getManifestsByCategory(category: ManifestTemplate['category']): ManifestTemplate[] {
  return manifestPresets.filter(preset => preset.category === category);
}

/**
 * Get manifest preset by ID
 */
export function getManifestById(id: string): ManifestTemplate | undefined {
  return manifestPresets.find(preset => preset.id === id);
}
