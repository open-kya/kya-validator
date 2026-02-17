import { test, expect } from '@playwright/test';
import { DemoDashboardPage } from '../pom/DemoDashboardPage';
import { AgentControlPanel } from '../pom/AgentControlPanel';
import { mockConfigEndpoint, mockSessionStart } from '../helpers/api-mock';

test.describe('UI Interaction Tests', () => {
  let dashboardPage: DemoDashboardPage;
  let agentControlPanel: AgentControlPanel;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DemoDashboardPage(page);
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

  test('UI-001: Start/Stop session buttons work', async ({ page }) => {
    // Verify Start Session button is visible and enabled initially
    await expect(dashboardPage.startSessionButton).toBeVisible();
    await expect(dashboardPage.startSessionButton).toBeEnabled();

    // Click Start Session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify button changes to End Session
    await expect(dashboardPage.endSessionButton).toBeVisible();
    await expect(dashboardPage.startSessionButton).not.toBeVisible();

    // Click End Session
    await dashboardPage.endSession();
    await dashboardPage.waitForSessionEnd();

    // Verify button changes back to Start Session
    await expect(dashboardPage.startSessionButton).toBeVisible();
    await expect(dashboardPage.endSessionButton).not.toBeVisible();
  });

  test('UI-002: Agent mode selection works', async ({ page }) => {
    // Locate Agent Mode selector
    const agentModeSelector = dashboardPage.agentModeSelector;

    // Verify default value is "LLM"
    let value = await dashboardPage.getAgentMode();
    expect(value).toBe('llm');

    // Select "Real LLM"
    await dashboardPage.selectAgentMode('llm');
    value = await dashboardPage.getAgentMode();
    expect(value).toBe('llm');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify mode is applied
    const mode = await agentControlPanel.getCurrentMode();
    expect(mode).toBe('Real LLM');

    // Verify selector is disabled when session is active
    await expect(agentModeSelector).toBeDisabled();
  });

  test('UI-003: Client type selection works', async ({ page }) => {
    // Locate Client Type selector
    const clientTypeSelector = dashboardPage.clientTypeSelector;

    // Verify default value is "Flow Storefront"
    let value = await dashboardPage.getClientType();
    expect(value).toBe('flow_storefront');

    // Select "Agent Receiver"
    await dashboardPage.selectClientType('agent_receiver');
    value = await dashboardPage.getClientType();
    expect(value).toBe('agent_receiver');

    // Select "Documentation Storefront"
    await dashboardPage.selectClientType('doc_storefront');
    value = await dashboardPage.getClientType();
    expect(value).toBe('doc_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify selector is disabled when session is active
    await expect(clientTypeSelector).toBeDisabled();
  });

  test('UI-004: Tab navigation works', async ({ page }) => {
    // Verify Dashboard tab is active
    await expect(dashboardPage.dashboardTab).toBeVisible();

    // Click Workflow Flow tab
    await dashboardPage.switchToWorkflowFlowTab();
    await expect(page.getByText('Workflow Visualization')).toBeVisible();
    await expect(page.getByText('Negotiation History')).not.toBeVisible();

    // Click Negotiation tab
    await dashboardPage.switchToNegotiationTab();
    await expect(page.getByText('Negotiation History')).toBeVisible();
    await expect(page.getByText('Workflow Visualization')).not.toBeVisible();

    // Click Dashboard tab
    await dashboardPage.switchToDashboardTab();
    await expect(page.getByText('Agent Control Panel')).toBeVisible();
    await expect(page.getByText('Negotiation History')).not.toBeVisible();
  });

  test('UI-005: All action buttons function', async ({ page }) => {
    // Verify Send Message button is disabled when session is inactive
    await expect(agentControlPanel.sendMessageButton).toBeVisible();
    await expect(agentControlPanel.sendMessageButton).toBeDisabled();

    // Verify Validate Manifest button is disabled when session is inactive
    await expect(agentControlPanel.validateManifestButton).toBeVisible();
    await expect(agentControlPanel.validateManifestButton).toBeDisabled();

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify Send Message button is enabled when session is active
    await expect(agentControlPanel.sendMessageButton).not.toBeDisabled();

    // Verify Validate Manifest button is enabled when session is active
    await expect(agentControlPanel.validateManifestButton).not.toBeDisabled();

    // Click Send Message button
    await agentControlPanel.sendMessage();

    // Note: In real scenario, this would send message to agent
    // For E2E tests, we verify that button click works

    // Click Validate Manifest button
    await agentControlPanel.validateManifest();

    // Note: In real scenario, this would trigger validation
    // For E2E tests, we verify that button click works
  });
});
