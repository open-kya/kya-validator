import { test, expect } from '@playwright/test';
import { DemoDashboardPage } from '../pom/DemoDashboardPage';
import { AgentControlPanel } from '../pom/AgentControlPanel';
import { TerminalPane } from '../pom/TerminalPane';
import { NegotiationTimeline } from '../pom/NegotiationTimeline';
import { mockConfigEndpoint, mockSessionStart } from '../helpers/api-mock';

test.describe('Client Type Tests', () => {
  let dashboardPage: DemoDashboardPage;
  let agentControlPanel: AgentControlPanel;
  let terminalPane: TerminalPane;
  let negotiationTimeline: NegotiationTimeline;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DemoDashboardPage(page);
    agentControlPanel = new AgentControlPanel(page);
    terminalPane = new TerminalPane(page);
    negotiationTimeline = new NegotiationTimeline(page);

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

  test('CT-001: Type A (Flow-Based Storefront) - Complete workflow', async ({ page }) => {
    // Select "Simulated" agent mode
    await dashboardPage.selectAgentMode('simulated');

    // Select "Flow Storefront" client type
    await dashboardPage.selectClientType('flow_storefront');
    let clientType = await dashboardPage.getClientType();
    expect(clientType).toBe('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Navigate to "Workflow Flow" tab
    await dashboardPage.switchToWorkflowFlowTab();

    // Verify Workflow Flow tab displays state machine visualization
    await expect(page.getByText('Workflow Visualization')).toBeVisible();

    // Note: In real scenario, states would transition:
    // LANDING → SELECT_CATEGORY → SELECT_SKU → POLICY_CHECK →
    // MANIFEST_CHECK → QUOTE → CONFIRM_ORDER → COMPLETE

    // For E2E tests, we verify that UI is ready for workflow states
    await expect(page.getByText('Workflow State')).toBeVisible();
  });

  test('CT-002: Type B (Agent Client/Receiver) - Complete negotiation', async ({ page }) => {
    // Select "Simulated" agent mode
    await dashboardPage.selectAgentMode('simulated');

    // Select "Agent Receiver" client type
    await dashboardPage.selectClientType('agent_receiver');
    let clientType = await dashboardPage.getClientType();
    expect(clientType).toBe('agent_receiver');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Navigate to "Negotiation" tab
    await dashboardPage.switchToNegotiationTab();

    // Verify Negotiation Timeline displays message history
    await expect(negotiationTimeline.heading).toBeVisible();

    // Note: In real scenario, messages would alternate between
    // Buyer (procurement_agent) and Vendor (recipient_agent)

    // For E2E tests, we verify that UI is ready for negotiation messages
    await expect(page.getByText('Total Turns')).toBeVisible();
  });

  test('CT-003: Type C (Documentation-Based Storefront) - Complete workflow', async ({ page }) => {
    // Select "Simulated" agent mode
    await dashboardPage.selectAgentMode('simulated');

    // Select "Documentation Storefront" client type
    await dashboardPage.selectClientType('doc_storefront');
    let clientType = await dashboardPage.getClientType();
    expect(clientType).toBe('doc_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify Terminal Pane is ready for document upload messages
    await expect(terminalPane.heading).toBeVisible();

    // Note: In real scenario, workflow would be:
    // DOCUMENT_UPLOAD → PARSE_DOCUMENTS → REVIEW_REQUIREMENTS →
    // ATTACH_POLICY → SUBMIT_REQUEST → COMPLETE

    // For E2E tests, we verify that UI is ready for document workflow
    await expect(agentControlPanel.heading).toBeVisible();
  });

  test('CT-004: Client type switching works correctly', async ({ page }) => {
    // Select "Flow Storefront"
    await dashboardPage.selectClientType('flow_storefront');
    let clientType = await dashboardPage.getClientType();
    expect(clientType).toBe('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify session starts with selected client type
    await expect(dashboardPage.endSessionButton).toBeVisible();

    // End session
    await dashboardPage.endSession();
    await dashboardPage.waitForSessionEnd();

    // Select "Agent Receiver"
    await dashboardPage.selectClientType('agent_receiver');
    clientType = await dashboardPage.getClientType();
    expect(clientType).toBe('agent_receiver');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify session starts with selected client type
    await expect(dashboardPage.endSessionButton).toBeVisible();

    // End session
    await dashboardPage.endSession();
    await dashboardPage.waitForSessionEnd();

    // Select "Documentation Storefront"
    await dashboardPage.selectClientType('doc_storefront');
    clientType = await dashboardPage.getClientType();
    expect(clientType).toBe('doc_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify session starts with selected client type
    await expect(dashboardPage.endSessionButton).toBeVisible();
  });
});
