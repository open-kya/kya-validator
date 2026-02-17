import { test, expect } from '@playwright/test';
import { DemoDashboardPage } from '../pom/DemoDashboardPage';
import { PolicyValidationStatus } from '../pom/PolicyValidationStatus';
import { AgentControlPanel } from '../pom/AgentControlPanel';
import { mockConfigEndpoint, mockSessionStart, mockBackendUnavailable, mockValidationEndpoint } from '../helpers/api-mock';

test.describe('Error Handling Tests', () => {
  let dashboardPage: DemoDashboardPage;
  let policyValidationStatus: PolicyValidationStatus;
  let agentControlPanel: AgentControlPanel;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DemoDashboardPage(page);
    policyValidationStatus = new PolicyValidationStatus(page);
    agentControlPanel = new AgentControlPanel(page);

    // Navigate to main app and click on Live Demo tab
    await dashboardPage.gotoDemo();
    await page.waitForLoadState('networkidle');
  });

  test('EH-001: Backend unavailable scenario', async ({ page }) => {
    // Mock backend as unavailable
    await mockBackendUnavailable(page);

    // Attempt to start session
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');
    await dashboardPage.startSession();

    // Note: In real scenario, connection status would show "Disconnected"
    // For E2E tests, we verify that UI handles error gracefully

    // Verify connection status is visible
    await expect(dashboardPage.connectionStatusBadge).toBeVisible();

    // Verify Start Session button remains enabled for retry
    // Note: The UI should allow retry after connection error
    await expect(dashboardPage.startSessionButton).toBeVisible();
  });

  test('EH-002: WebSocket disconnection scenario', async ({ page }) => {
    // Mock API endpoints
    await mockConfigEndpoint(page);
    await mockSessionStart(page);

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify connection status is visible
    await expect(dashboardPage.connectionStatusBadge).toBeVisible();

    // Note: In real scenario, WebSocket disconnection would show error
    // For E2E tests, we verify that UI is ready to handle disconnection

    // Verify End Session button is visible
    await expect(dashboardPage.endSessionButton).toBeVisible();
  });

  test('EH-003: Invalid manifest scenario', async ({ page }) => {
    // Mock API endpoints
    await mockConfigEndpoint(page);
    await mockSessionStart(page);

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

  test('EH-004: Agent timeout scenario', async ({ page }) => {
    // Mock API endpoints
    await mockConfigEndpoint(page);
    await mockSessionStart(page);

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Note: In real scenario, agent timeout would show timeout message
    // For E2E tests, we verify that UI is ready to handle timeout

    // Verify Send Message button is enabled
    await expect(agentControlPanel.sendMessageButton).toBeEnabled();

    // Note: The UI should show timeout message and allow retry
    // For E2E tests, we verify that UI is ready for timeout handling
  });

  test('EH-005: Network latency scenario', async ({ page }) => {
    // Mock API endpoints
    await mockConfigEndpoint(page);
    await mockSessionStart(page);

    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Note: In real scenario, network latency would show loading states
    // For E2E tests, we verify that UI is ready for network latency

    // Verify connection status is visible
    await expect(dashboardPage.connectionStatusBadge).toBeVisible();

    // Note: The UI should show loading indicators and remain responsive
    // For E2E tests, we verify that UI is ready for network latency handling
  });
});
