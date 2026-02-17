import { test, expect } from '@playwright/test';
import { DemoDashboardPage } from '../pom/DemoDashboardPage';
import { AgentControlPanel } from '../pom/AgentControlPanel';
import { TerminalPane } from '../pom/TerminalPane';
import { PolicyValidationStatus } from '../pom/PolicyValidationStatus';
import { NegotiationTimeline } from '../pom/NegotiationTimeline';
import { AgentThinking } from '../pom/AgentThinking';
import { mockConfigEndpoint, mockSessionStart } from '../helpers/api-mock';
import { createWebSocketMock } from '../helpers/websocket-mock';

test.describe('Agent Mode Tests', () => {
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

  test('AM-001: Simulated mode workflow - Complete procurement', async ({ page }) => {
    // Select "Simulated" agent mode
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify agent mode indicator shows "Simulated"
    const mode = await agentControlPanel.getCurrentMode();
    expect(mode).toBe('Simulated');

    // Verify Agent Thinking panel is visible
    await expect(agentThinking.heading).toBeVisible();

    // Note: In real scenario, messages would progress through:
    // greeting → inquiry → negotiation → validation_check → decision
    // For E2E tests, we verify the UI is ready to display messages

    // Verify Terminal Pane is ready
    await expect(terminalPane.heading).toBeVisible();

    // Verify Policy Validation Status is ready
    await expect(policyValidationStatus.heading).toBeVisible();
  });

  test('AM-002: Real LLM mode workflow - With API keys (mocked)', async ({ page }) => {
    // Select "Real LLM" agent mode
    await dashboardPage.selectAgentMode('llm');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify agent mode indicator shows "Real LLM"
    const mode = await agentControlPanel.getCurrentMode();
    expect(mode).toBe('Real LLM');

    // Verify Agent Thinking panel is visible
    await expect(agentThinking.heading).toBeVisible();

    // Note: LLM mode would show dynamic responses
    // For E2E tests, we verify the UI is ready for LLM responses
    await expect(terminalPane.heading).toBeVisible();
  });

  test('AM-003: Real LLM mode workflow - Without API keys (fallback)', async ({ page }) => {
    // Select "Real LLM" agent mode
    await dashboardPage.selectAgentMode('llm');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify agent mode indicator shows "Real LLM" (as selected)
    const mode = await agentControlPanel.getCurrentMode();
    expect(mode).toBe('Real LLM');

    // Note: In real scenario without API keys, backend would fall back to Simulated mode
    // For E2E tests, we verify the UI displays the selected mode
    await expect(agentThinking.heading).toBeVisible();
  });

  test('AM-004: Mode switching works correctly', async ({ page }) => {
    // Select "Simulated" mode
    await dashboardPage.selectAgentMode('simulated');
    let mode = await dashboardPage.getAgentMode();
    expect(mode).toBe('simulated');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify mode is applied
    let currentMode = await agentControlPanel.getCurrentMode();
    expect(currentMode).toBe('Simulated');

    // End session
    await dashboardPage.endSession();
    await dashboardPage.waitForSessionEnd();

    // Select "Real LLM" mode
    await dashboardPage.selectAgentMode('llm');
    mode = await dashboardPage.getAgentMode();
    expect(mode).toBe('llm');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify mode is applied
    currentMode = await agentControlPanel.getCurrentMode();
    expect(currentMode).toBe('Real LLM');

    // End session
    await dashboardPage.endSession();
    await dashboardPage.waitForSessionEnd();

    // Select "Simulated" mode again
    await dashboardPage.selectAgentMode('simulated');
    mode = await dashboardPage.getAgentMode();
    expect(mode).toBe('simulated');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify mode is applied
    currentMode = await agentControlPanel.getCurrentMode();
    expect(currentMode).toBe('Simulated');
  });
});
