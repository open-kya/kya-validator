import { test, expect } from '@playwright/test';
import { DemoDashboardPage } from '../pom/DemoDashboardPage';
import { PolicyValidationStatus } from '../pom/PolicyValidationStatus';
import { AgentControlPanel } from '../pom/AgentControlPanel';
import { mockConfigEndpoint, mockSessionStart, mockValidationEndpoint } from '../helpers/api-mock';

test.describe('Policy Validation Tests', () => {
  let dashboardPage: DemoDashboardPage;
  let policyValidationStatus: PolicyValidationStatus;
  let agentControlPanel: AgentControlPanel;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DemoDashboardPage(page);
    policyValidationStatus = new PolicyValidationStatus(page);
    agentControlPanel = new AgentControlPanel(page);

    // Mock API endpoints
    await mockConfigEndpoint(page);
    await mockSessionStart(page);

    // Navigate to main app and click on Live Demo tab
    await page.goto('/');
    await page.getByRole('button', { name: 'Live Demo' }).click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    if (await dashboardPage.isSessionActive()) {
      await dashboardPage.endSession();
    }
  });

  test('PV-001: Manifest validation triggers correctly', async ({ page }) => {
    // Mock validation endpoint
    await mockValidationEndpoint(page, {
      validation_status: 'valid',
      validation_errors: [],
      mcp_validated: true,
      tee_validated: true,
      blockchain_validated: true,
    });

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Click Validate Manifest button
    await agentControlPanel.validateManifest();

    // Verify validation status is updated
    // Note: In real scenario, validation would trigger at MANIFEST_CHECK state
    // For E2E tests, we verify that UI updates with validation result
    await expect(policyValidationStatus.heading).toBeVisible();
  });

  test('PV-002: Validation status updates', async ({ page }) => {
    // Mock validation endpoint with pending status first
    await mockValidationEndpoint(page, {
      validation_status: 'pending',
      validation_errors: [],
      mcp_validated: false,
      tee_validated: false,
      blockchain_validated: false,
    });

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Click Validate Manifest button
    await agentControlPanel.validateManifest();

    // Wait for validation to show PENDING
    await policyValidationStatus.waitForValidationPending();

    // Now mock valid result
    await mockValidationEndpoint(page, {
      validation_status: 'valid',
      validation_errors: [],
      mcp_validated: true,
      tee_validated: true,
      blockchain_validated: true,
    });

    // Click Validate Manifest again
    await agentControlPanel.validateManifest();

    // Wait for validation to complete
    await policyValidationStatus.waitForValidationComplete();

    // Verify status shows "VALID"
    const status = await policyValidationStatus.getOverallStatus();
    expect(status).toContain('VALID');
  });

  test('PV-003: MCP validation displays', async ({ page }) => {
    // Mock validation endpoint
    await mockValidationEndpoint(page, {
      validation_status: 'valid',
      validation_errors: [],
      mcp_validated: true,
      tee_validated: true,
      blockchain_validated: true,
    });

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Click Validate Manifest button
    await agentControlPanel.validateManifest();
    await policyValidationStatus.waitForValidationComplete();

    // Verify MCP Validation section is visible
    await expect(policyValidationStatus.mcpValidationSection).toBeVisible();

    // Verify status shows "Valid"
    const mcpStatus = await policyValidationStatus.getMcpValidationStatus();
    expect(mcpStatus).toContain('Valid');
  });

  test('PV-004: TEE validation displays', async ({ page }) => {
    // Mock validation endpoint
    await mockValidationEndpoint(page, {
      validation_status: 'valid',
      validation_errors: [],
      mcp_validated: true,
      tee_validated: true,
      blockchain_validated: true,
    });

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Click Validate Manifest button
    await agentControlPanel.validateManifest();
    await policyValidationStatus.waitForValidationComplete();

    // Verify TEE Validation section is visible
    await expect(policyValidationStatus.teeValidationSection).toBeVisible();

    // Verify status shows "Valid"
    const teeStatus = await policyValidationStatus.getTeeValidationStatus();
    expect(teeStatus).toContain('Valid');
  });

  test('PV-005: Blockchain validation displays', async ({ page }) => {
    // Mock validation endpoint
    await mockValidationEndpoint(page, {
      validation_status: 'valid',
      validation_errors: [],
      mcp_validated: true,
      tee_validated: true,
      blockchain_validated: true,
    });

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Click Validate Manifest button
    await agentControlPanel.validateManifest();
    await policyValidationStatus.waitForValidationComplete();

    // Verify Blockchain Validation section is visible
    await expect(policyValidationStatus.blockchainValidationSection).toBeVisible();

    // Verify status shows "Valid"
    const blockchainStatus = await policyValidationStatus.getBlockchainValidationStatus();
    expect(blockchainStatus).toContain('Valid');
  });

  test('PV-006: Invalid manifests show errors', async ({ page }) => {
    // Mock validation endpoint with invalid result
    await mockValidationEndpoint(page, {
      validation_status: 'invalid',
      validation_errors: [
        {
          code: 'SCHEMA_VIOLATION',
          message: 'Manifest does not conform to schema',
          severity: 'error',
        },
        {
          code: 'TTL_EXPIRED',
          message: 'Manifest TTL has expired',
          severity: 'warning',
        },
      ],
      mcp_validated: false,
      tee_validated: false,
      blockchain_validated: false,
    });

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Trigger validation with invalid manifest
    await agentControlPanel.validateManifest();
    await policyValidationStatus.waitForValidationComplete();

    // Verify validation status shows "INVALID"
    const status = await policyValidationStatus.getOverallStatus();
    expect(status).toContain('INVALID');

    // Verify error section is visible
    const hasErrors = await policyValidationStatus.hasValidationErrors();
    expect(hasErrors).toBe(true);
  });
});
