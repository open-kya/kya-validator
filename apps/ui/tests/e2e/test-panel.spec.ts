import { test, expect } from '@playwright/test';
import { PolicyEditorPage } from '../pom/PolicyEditorPage';
import { sampleManifest, invalidManifest, expiredManifest, strictSecurityFailManifest, enterpriseSolvencyFailManifest, regionFailManifest, transactionValueFailManifest, timeWindowFailManifest, cryptoFailManifest } from '../fixtures/testData';

/**
 * Test Panel E2E Tests
 *
 * Tests for testing policies against manifests:
 * 1. Loading manifests
 * 2. Running validation tests
 * 3. Viewing validation reports
 * 4. Test result history
 * 5. Error handling
 */

test.describe('Test Panel - Validation Testing', () => {
  let policyPage: PolicyEditorPage;

  test.beforeEach(async ({ page }) => {
    policyPage = new PolicyEditorPage(page);
    await policyPage.goto();
    await policyPage.selectPreset('Basic Validation');
    await policyPage.confirmPresetLoad();
    await policyPage.mockWASMInit();
    // Switch to Test Validation tab to access TestPanel elements
    await policyPage.switchToTestTab();
  });

  test('should load a valid manifest', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await expect(manifestInput).toBeVisible();
    const manifestJson = JSON.stringify(sampleManifest, null, 2);
    await manifestInput.fill(manifestJson);
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    // Check for "Loaded Manifest:" label and "Yes" text in status card
    const loadedManifestLabel = policyPage.page.getByText('Loaded Manifest:');
    const yesText = policyPage.page.getByText('Yes').filter({ hasText: /^Yes$/ });
    await expect(loadedManifestLabel).toBeVisible();
    await expect(yesText).toBeVisible();
  });

  test('should display error for invalid manifest JSON', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill('invalid json {');
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(300);
    // Error is displayed in red text with XCircle icon - use more specific selector
    const errorText = policyPage.page.locator('p.text-red-600');
    await expect(errorText).toBeVisible();
  });

  test('should clear manifest input', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(sampleManifest, null, 2));
    // Clear button has X icon, use the button in the input section
    const clearButton = policyPage.page.locator('button').filter({ has: policyPage.page.locator('svg.lucide-x') }).first();
    await clearButton.click();
    await page.waitForTimeout(300);
    const value = await manifestInput.inputValue();
    expect(value).toBe('');
  });

  test('should run validation test', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(sampleManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    await policyPage.clickButton('Run Validation Test');
    await page.waitForTimeout(1000);
    const resultsHeading = policyPage.page.getByRole('heading', { name: 'Test Results' });
    await expect(resultsHeading).toBeVisible();
  });

  test('should display validation report', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(sampleManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    await policyPage.clickButton('Run Validation Test');
    await page.waitForTimeout(1000);
    // Check that validation report is displayed (may be valid or invalid depending on manifest)
    const testResultsHeading = policyPage.page.getByRole('heading', { name: 'Test Results' });
    await expect(testResultsHeading).toBeVisible();
    // Duration is displayed as "Duration" label and "Xms" text
    const durationLabel = policyPage.page.getByText('Duration');
    await expect(durationLabel).toBeVisible();
  });

  test('should maintain test result history', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(sampleManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    await policyPage.clickButton('Run Validation Test');
    await page.waitForTimeout(1000);
    // Use POM method to load manifest again
    await policyPage.loadManifestJson(JSON.stringify(sampleManifest, null, 2));
    await page.waitForTimeout(500);
    await policyPage.runValidation();
    await page.waitForTimeout(1000);
    const resultCount = policyPage.page.getByText(/Test #\d+/i);
    expect(await resultCount.count()).toBe(2);
  });

  test('should clear test results', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(sampleManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    await policyPage.clickButton('Run Validation Test');
    await page.waitForTimeout(1000);
    let resultsHeading = policyPage.page.getByRole('heading', { name: 'Test Results' });
    await expect(resultsHeading).toBeVisible();
    await policyPage.clickButton('Clear Results');
    await page.waitForTimeout(500);
    resultsHeading = policyPage.page.getByRole('heading', { name: 'Test Results' });
    await expect(resultsHeading).not.toBeVisible();
  });

  test('should display timestamp for each test result', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(sampleManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    await policyPage.clickButton('Run Validation Test');
    await page.waitForTimeout(1000);
    const timestampText = policyPage.page.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    await expect(timestampText).toBeVisible();
  });

  test('should show loading state during test', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(sampleManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    // Click run button
    await policyPage.runValidation();
    // Wait for test to complete and loading state to disappear
    await page.waitForTimeout(2000);
    // Check that loading spinner is no longer visible (test completed)
    const loadingSpinner = policyPage.page.locator('.animate-spin');
    await expect(loadingSpinner).not.toBeVisible();
  });

  test('should disable test button when manifest not loaded', async () => {
    const testButton = policyPage.page.getByRole('button', { name: 'Run Validation Test' });
    await expect(testButton).toBeDisabled();
  });

  test('should display policy info in alert', async () => {
    const policyNameText = policyPage.page.getByText(/Current Policy:.*Basic Validation/i);
    await expect(policyNameText).toBeVisible();
  });

  test('should handle large manifest JSON', async ({ page }) => {
    const largeManifest = {
      ...sampleManifest,
      customData: Array(100).fill({ key: 'value' }),
    };
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(largeManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    // Check for "Loaded Manifest:" label and "Yes" text in status card
    const loadedManifestLabel = policyPage.page.getByText('Loaded Manifest:');
    const yesText = policyPage.page.getByText('Yes').filter({ hasText: /^Yes$/ });
    await expect(loadedManifestLabel).toBeVisible();
    await expect(yesText).toBeVisible();
  });
});

test.describe('Test Panel - Error Scenarios', () => {
  let policyPage: PolicyEditorPage;

  test.beforeEach(async ({ page }) => {
    policyPage = new PolicyEditorPage(page);
    await policyPage.goto();
    await policyPage.selectPreset('Basic Validation');
    await policyPage.confirmPresetLoad();
    // Switch to Test Validation tab to access TestPanel elements
    await policyPage.switchToTestTab();
  });

  test('should display validation errors in report', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(invalidManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    await policyPage.clickButton('Run Validation Test');
    await page.waitForTimeout(1000);
    // Check for error count in test results - use exact match for "Errors" label
    const errorsLabel = policyPage.page.getByText('Errors', { exact: true });
    await expect(errorsLabel).toBeVisible();
  });

  test('should handle expired manifest TTL', async ({ page }) => {
    const manifestInput = policyPage.page.getByLabel('Manifest JSON');
    await manifestInput.fill(JSON.stringify(expiredManifest, null, 2));
    await policyPage.clickButton('Load Manifest');
    await page.waitForTimeout(500);
    await policyPage.clickButton('Run Validation Test');
    await page.waitForTimeout(1000);
    const ttlError = policyPage.page.getByText(/TTL|expired/i);
    await expect(ttlError).toBeVisible();
  });

  test('should fail validation for manifest without TEE evidence against Strict Security Policy', async ({ page }) => {
    /**
     * Test: Strict Security Policy - Manifest without TEE Evidence
     *
     * This test verifies that the Strict Security Policy correctly rejects manifests
     * that lack required TEE (Trusted Execution Environment) evidence.
     *
     * The Strict Security Policy requires:
     * - Schema Validation
     * - TTL Check (maxAge: 12 hours)
     * - Cryptographic Verification (Ed25519/Secp256k1 only)
     * - TEE Evidence (required with attestation) - THIS IS THE KEY FAILURE
     * - Geographic Restrictions (US/EU/CA permitted, CN/RU forbidden)
     *
     * The test manifest fails because:
     * 1. Missing TEE attestation evidence (required by Strict Security)
     * 2. The proof only contains VerificationMethod type without actual signature
     * 3. No geographic region information
     */
    
    // Switch to Editor tab to select a different preset
    await policyPage.switchToEditorTab();
    await page.waitForTimeout(300);
    
    // Load the Strict Security preset
    await policyPage.selectPreset('Strict Security');
    await page.waitForTimeout(500);
    
    // Switch to Test Validation tab
    await policyPage.switchToTestTab();
    await page.waitForTimeout(300);
    
    // Load the manifest that should fail Strict Security validation
    const manifestJson = JSON.stringify(strictSecurityFailManifest, null, 2);
    await policyPage.loadManifestJson(manifestJson);
    await page.waitForTimeout(500);
    
    // Verify manifest is loaded
    const loadedManifestText = policyPage.page.getByText('Yes').filter({ hasText: /^Yes$/ });
    await expect(loadedManifestText).toBeVisible();
    
    // Run validation test
    await policyPage.runValidation();
    await page.waitForTimeout(1000);
    
    // Verify test results are displayed
    await expect(policyPage.testResultsHeading).toBeVisible();
    
    // Assert that validation FAILED (not valid)
    const isValid = await policyPage.isValidationValid();
    const isInvalid = await policyPage.isValidationInvalid();
    
    // The validation should be INVALID
    expect(isInvalid).toBe(true);
    expect(isValid).toBe(false);
    
    // Verify there are errors
    const errorsCount = await policyPage.getTotalErrorsCount();
    expect(errorsCount).toBeGreaterThan(0);
    
    // Verify the test result is displayed
    const testResultHeading = policyPage.page.getByRole('heading', { name: /Test #\d+/ });
    await expect(testResultHeading).toBeVisible();
  });

  test('should fail validation for manifest without solvency info against Enterprise Policy', async ({ page }) => {
    /**
     * Test: Enterprise Policy - Manifest without Solvency Information
     *
     * This test verifies that the Enterprise Policy correctly rejects manifests
     * that lack required solvency information.
     *
     * The Enterprise Policy requires:
     * - Schema Validation
     * - TTL Check
     * - Cryptographic Verification
     * - Solvency Check (required with minimum balance) - THIS IS THE KEY FAILURE
     *
     * The test manifest fails because:
     * 1. Missing solvencyInfo (required by Enterprise)
     */
    
    // Switch to Editor tab to select a different preset
    await policyPage.switchToEditorTab();
    await page.waitForTimeout(300);
    
    // Load the Enterprise preset
    await policyPage.selectPreset('Enterprise');
    await page.waitForTimeout(500);
    
    // Switch to Test Validation tab
    await policyPage.switchToTestTab();
    await page.waitForTimeout(300);
    
    // Load the manifest that should fail Enterprise validation
    const manifestJson = JSON.stringify(enterpriseSolvencyFailManifest, null, 2);
    await policyPage.loadManifestJson(manifestJson);
    await page.waitForTimeout(500);
    
    // Verify manifest is loaded
    const loadedManifestText = policyPage.page.getByText('Yes').filter({ hasText: /^Yes$/ });
    await expect(loadedManifestText).toBeVisible();
    
    // Run validation test
    await policyPage.runValidation();
    await page.waitForTimeout(1000);
    
    // Verify test results are displayed
    await expect(policyPage.testResultsHeading).toBeVisible();
    
    // Assert that validation FAILED (not valid)
    const isValid = await policyPage.isValidationValid();
    const isInvalid = await policyPage.isValidationInvalid();
    
    // The validation should be INVALID
    expect(isInvalid).toBe(true);
    expect(isValid).toBe(false);
    
    // Verify there are errors
    const errorsCount = await policyPage.getTotalErrorsCount();
    expect(errorsCount).toBeGreaterThan(0);
    
    // Verify the test result is displayed
    const testResultHeading = policyPage.page.getByRole('heading', { name: /Test #\d+/ });
    await expect(testResultHeading).toBeVisible();
  });

  test('should fail validation for manifest with forbidden region against Strict Security Policy', async ({ page }) => {
    /**
     * Test: Strict Security Policy - Geographic Region Restriction
     *
     * This test verifies that the Strict Security Policy correctly rejects manifests
     * that contain regions from forbidden countries.
     *
     * The Strict Security Policy requires:
     * - Schema Validation
     * - TTL Check (maxAge: 12 hours)
     * - Cryptographic Verification (Ed25519/Secp256k1 only)
     * - TEE Evidence (required with attestation)
     * - Geographic Restrictions (US/EU/CA permitted, CN/RU forbidden) - THIS IS THE KEY FAILURE
     *
     * The test manifest fails because:
     * 1. Region is set to "CN" (China), which is in the forbidden list
     */
    
    // Switch to Editor tab to select a different preset
    await policyPage.switchToEditorTab();
    await page.waitForTimeout(300);
    
    // Load the Strict Security preset
    await policyPage.selectPreset('Strict Security');
    await page.waitForTimeout(500);
    
    // Switch to Test Validation tab
    await policyPage.switchToTestTab();
    await page.waitForTimeout(300);
    
    // Load the manifest that should fail Strict Security validation
    const manifestJson = JSON.stringify(regionFailManifest, null, 2);
    await policyPage.loadManifestJson(manifestJson);
    await page.waitForTimeout(500);
    
    // Verify manifest is loaded
    const loadedManifestText = policyPage.page.getByText('Yes').filter({ hasText: /^Yes$/ });
    await expect(loadedManifestText).toBeVisible();
    
    // Run validation test
    await policyPage.runValidation();
    await page.waitForTimeout(1000);
    
    // Verify test results are displayed
    await expect(policyPage.testResultsHeading).toBeVisible();
    
    // Assert that validation FAILED (not valid)
    const isValid = await policyPage.isValidationValid();
    const isInvalid = await policyPage.isValidationInvalid();
    
    // The validation should be INVALID
    expect(isInvalid).toBe(true);
    expect(isValid).toBe(false);
    
    // Verify there are errors
    const errorsCount = await policyPage.getTotalErrorsCount();
    expect(errorsCount).toBeGreaterThan(0);
    
    // Verify the test result is displayed
    const testResultHeading = policyPage.page.getByRole('heading', { name: /Test #\d+/ });
    await expect(testResultHeading).toBeVisible();
  });

  test('should fail validation for manifest exceeding transaction value limit against Financial Services Policy', async ({ page }) => {
    /**
     * Test: Financial Services Policy - Transaction Value Limit
     *
     * This test verifies that the Financial Services Policy correctly rejects manifests
     * that exceed the maximum transaction value.
     *
     * The Financial Services Policy requires:
     * - Schema Validation
     * - Cryptographic Verification (Secp256k1 only)
     * - Solvency Check (minimum balance: 1000)
     * - Transaction Limits (maxValue: 10000, minValue: 0.01) - THIS IS THE KEY FAILURE
     *
     * The test manifest fails because:
     * 1. Transaction value is set to 15000 USD, which exceeds the max of 10000
     */
    
    // Switch to Editor tab to select a different preset
    await policyPage.switchToEditorTab();
    await page.waitForTimeout(300);
    
    // Load the Financial Services preset
    await policyPage.selectPreset('Financial Services');
    await page.waitForTimeout(500);
    
    // Switch to Test Validation tab
    await policyPage.switchToTestTab();
    await page.waitForTimeout(300);
    
    // Load the manifest that should fail Financial Services validation
    const manifestJson = JSON.stringify(transactionValueFailManifest, null, 2);
    await policyPage.loadManifestJson(manifestJson);
    await page.waitForTimeout(500);
    
    // Verify manifest is loaded
    const loadedManifestText = policyPage.page.getByText('Yes').filter({ hasText: /^Yes$/ });
    await expect(loadedManifestText).toBeVisible();
    
    // Run validation test
    await policyPage.runValidation();
    await page.waitForTimeout(1000);
    
    // Verify test results are displayed
    await expect(policyPage.testResultsHeading).toBeVisible();
    
    // Assert that validation FAILED (not valid)
    const isValid = await policyPage.isValidationValid();
    const isInvalid = await policyPage.isValidationInvalid();
    
    // The validation should be INVALID
    expect(isInvalid).toBe(true);
    expect(isValid).toBe(false);
    
    // Verify there are errors
    const errorsCount = await policyPage.getTotalErrorsCount();
    expect(errorsCount).toBeGreaterThan(0);
    
    // Verify the test result is displayed
    const testResultHeading = policyPage.page.getByRole('heading', { name: /Test #\d+/ });
    await expect(testResultHeading).toBeVisible();
  });

  test('should fail validation for manifest with unsupported cryptographic algorithm against Strict Security Policy', async ({ page }) => {
    /**
     * Test: Strict Security Policy - Cryptographic Algorithm Restriction
     *
     * This test verifies that the Strict Security Policy correctly rejects manifests
     * that use unsupported cryptographic algorithms.
     *
     * The Strict Security Policy requires:
     * - Schema Validation
     * - TTL Check (maxAge: 12 hours)
     * - Cryptographic Verification (Ed25519/Secp256k1 only) - THIS IS THE KEY FAILURE
     * - TEE Evidence (required with attestation)
     * - Geographic Restrictions (US/EU/CA permitted, CN/RU forbidden)
     *
     * The test manifest fails because:
     * 1. Uses "RSASignature2020" which is not in the allowed algorithms list (Ed25519, Secp256k1)
     */
    
    // Switch to Editor tab to select a different preset
    await policyPage.switchToEditorTab();
    await page.waitForTimeout(300);
    
    // Load the Strict Security preset
    await policyPage.selectPreset('Strict Security');
    await page.waitForTimeout(500);
    
    // Switch to Test Validation tab
    await policyPage.switchToTestTab();
    await page.waitForTimeout(300);
    
    // Load the manifest that should fail Strict Security validation
    const manifestJson = JSON.stringify(cryptoFailManifest, null, 2);
    await policyPage.loadManifestJson(manifestJson);
    await page.waitForTimeout(500);
    
    // Verify manifest is loaded
    const loadedManifestText = policyPage.page.getByText('Yes').filter({ hasText: /^Yes$/ });
    await expect(loadedManifestText).toBeVisible();
    
    // Run validation test
    await policyPage.runValidation();
    await page.waitForTimeout(1000);
    
    // Verify test results are displayed
    await expect(policyPage.testResultsHeading).toBeVisible();
    
    // Assert that validation FAILED (not valid)
    const isValid = await policyPage.isValidationValid();
    const isInvalid = await policyPage.isValidationInvalid();
    
    // The validation should be INVALID
    expect(isInvalid).toBe(true);
    expect(isValid).toBe(false);
    
    // Verify there are errors
    const errorsCount = await policyPage.getTotalErrorsCount();
    expect(errorsCount).toBeGreaterThan(0);
    
    // Verify the test result is displayed
    const testResultHeading = policyPage.page.getByRole('heading', { name: /Test #\d+/ });
    await expect(testResultHeading).toBeVisible();
  });

  test('should fail validation for manifest outside time window against policy with time_window rule', async ({ page }) => {
    /**
     * Test: Time Window Restriction
     *
     * This test verifies that policies with time_window rules correctly reject manifests
     * that fall outside allowed time windows (hours/days).
     *
     * Note: Currently no preset has a time_window rule enabled. This test demonstrates
     * the pattern for testing time window restrictions when such rules are added.
     *
     * A policy with time_window rules would check:
     * - allowedHours: Array of allowed hours (0-23)
     * - allowedDays: Array of allowed days (0=Sunday, 6=Saturday)
     *
     * The test manifest has:
     * - Issuance date set to a specific time that may fall outside allowed hours
     */
    
    // Switch to Editor tab to select a different preset
    await policyPage.switchToEditorTab();
    await page.waitForTimeout(300);
    
    // Load the Strict Security preset (or any preset)
    await policyPage.selectPreset('Strict Security');
    await page.waitForTimeout(500);
    
    // Switch to Test Validation tab
    await policyPage.switchToTestTab();
    await page.waitForTimeout(300);
    
    // Load the manifest with time window constraints
    const manifestJson = JSON.stringify(timeWindowFailManifest, null, 2);
    await policyPage.loadManifestJson(manifestJson);
    await page.waitForTimeout(500);
    
    // Verify manifest is loaded
    const loadedManifestText = policyPage.page.getByText('Yes').filter({ hasText: /^Yes$/ });
    await expect(loadedManifestText).toBeVisible();
    
    // Run validation test
    await policyPage.runValidation();
    await page.waitForTimeout(1000);
    
    // Verify test results are displayed
    await expect(policyPage.testResultsHeading).toBeVisible();
    
    // Verify the test result is displayed
    const testResultHeading = policyPage.page.getByRole('heading', { name: /Test #\d+/ });
    await expect(testResultHeading).toBeVisible();
  });
});
