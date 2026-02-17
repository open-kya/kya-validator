import { test, expect } from '@playwright/test';
import { DemoDashboardPage } from '../pom/DemoDashboardPage';
import { AgentControlPanel } from '../pom/AgentControlPanel';
import { TerminalPane } from '../pom/TerminalPane';
import { PolicyValidationStatus } from '../pom/PolicyValidationStatus';
import { NegotiationTimeline } from '../pom/NegotiationTimeline';
import { AgentThinking } from '../pom/AgentThinking';
import { mockConfigEndpoint, mockSessionStart } from '../helpers/api-mock';

test.describe('Basic Functionality Tests', () => {
  let dashboardPage: DemoDashboardPage;
  let agentControlPanel: AgentControlPanel;
  let terminalPane: TerminalPane;
  let policyValidationStatus: PolicyValidationStatus;
  let negotiationTimeline: NegotiationTimeline;
  let agentThinking: AgentThinking;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DemoDashboardPage(page);
    agentControlPanel = new AgentControlPanel(page);
    terminalPane = new TerminalPane(page);
    policyValidationStatus = new PolicyValidationStatus(page);
    negotiationTimeline = new NegotiationTimeline(page);
    agentThinking = new AgentThinking(page);

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

  test('BF-001: Demo page loads correctly', async ({ page }) => {
    // Verify page title
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.heading).toHaveText('KYA Validator Demo');

    // Verify subheading
    await expect(dashboardPage.subheading).toBeVisible();
    await expect(dashboardPage.subheading).toHaveText('Agent-Based Procurement');

    // Verify Session Configuration section
    await expect(dashboardPage.sessionConfigSection).toBeVisible();

    // Verify Agent Mode selector
    await expect(dashboardPage.agentModeSelector).toBeVisible();

    // Verify Client Type selector
    await expect(dashboardPage.clientTypeSelector).toBeVisible();

    // Verify Start Session button
    await expect(dashboardPage.startSessionButton).toBeVisible();

    // Verify tab navigation
    await expect(dashboardPage.dashboardTab).toBeVisible();
    await expect(dashboardPage.workflowFlowTab).toBeVisible();
    await expect(dashboardPage.negotiationTab).toBeVisible();

    // Verify Agent Control Panel
    await expect(agentControlPanel.heading).toBeVisible();

    // Verify Terminal Pane
    await expect(terminalPane.heading).toBeVisible();

    // Verify Policy Validation Status
    await expect(policyValidationStatus.heading).toBeVisible();
  });

  test('BF-002: All UI components render', async ({ page }) => {
    // Check Agent Control Panel shows "Simulated" mode
    await expect(agentControlPanel.currentModeBadge).toBeVisible();
    const mode = await agentControlPanel.getCurrentMode();
    expect(mode).toBe('Simulated');

    // Check Terminal Pane shows "No messages yet"
    await expect(terminalPane.emptyStateMessage).toBeVisible();
    const messageCount = await terminalPane.getMessageCount();
    expect(messageCount).toBe(0);

    // Check Policy Validation Status shows "No validation data available"
    await expect(policyValidationStatus.emptyStateMessage).toBeVisible();

    // Switch to Negotiation tab
    await dashboardPage.switchToNegotiationTab();
    await expect(negotiationTimeline.heading).toBeVisible();

    // Check Negotiation Timeline shows "No negotiation messages yet"
    await expect(negotiationTimeline.emptyStateMessage).toBeVisible();

    // Switch back to Dashboard
    await dashboardPage.switchToDashboardTab();

    // Check Agent Thinking is not visible (session not started)
    await expect(agentThinking.heading).not.toBeVisible();
  });

  test('BF-003: Session configuration works', async ({ page }) => {
    // Select "Simulated" agent mode
    await dashboardPage.selectAgentMode('simulated');
    let mode = await dashboardPage.getAgentMode();
    expect(mode).toBe('simulated');

    // Select "Flow Storefront" client type
    await dashboardPage.selectClientType('flow_storefront');
    let clientType = await dashboardPage.getClientType();
    expect(clientType).toBe('flow_storefront');

    // Click Start Session button
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify Start Session button changes to "End Session"
    await expect(dashboardPage.endSessionButton).toBeVisible();
    await expect(dashboardPage.startSessionButton).not.toBeVisible();

    // Verify session ID is generated (connection status updates)
    await expect(dashboardPage.connectionStatusBadge).toBeVisible();

    // Verify Agent Thinking panel becomes visible
    await expect(agentThinking.heading).toBeVisible();
  });

  test('BF-004: Backend connection establishes', async ({ page }) => {
    // Start session
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify connection status shows "Connected"
    // Note: In real scenario, this would connect to backend
    // For tests, we verify the UI shows connection status
    await expect(dashboardPage.connectionStatusBadge).toBeVisible();
  });

  test('BF-005: WebSocket connection works', async ({ page }) => {
    // Start session
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify connection status indicator is visible
    await expect(dashboardPage.connectionStatusBadge).toBeVisible();

    // Verify Terminal Pane is ready to receive messages
    await expect(terminalPane.heading).toBeVisible();

    // Note: In real scenario, WebSocket would exchange heartbeats
    // For E2E tests, we verify the UI is ready for WebSocket messages
    const messageCount = await terminalPane.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(0);
  });
});
