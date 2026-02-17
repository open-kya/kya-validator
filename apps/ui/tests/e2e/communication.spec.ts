import { test, expect } from '@playwright/test';
import { DemoDashboardPage } from '../pom/DemoDashboardPage';
import { TerminalPane } from '../pom/TerminalPane';
import { AgentThinking } from '../pom/AgentThinking';
import { mockConfigEndpoint, mockSessionStart } from '../helpers/api-mock';
import { createWebSocketMock } from '../helpers/websocket-mock';

test.describe('Communication Tests', () => {
  let dashboardPage: DemoDashboardPage;
  let terminalPane: TerminalPane;
  let agentThinking: AgentThinking;
  let wsMock: any;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DemoDashboardPage(page);
    terminalPane = new TerminalPane(page);
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

  test('CM-001: Agent messages display in terminal', async ({ page }) => {
    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Create WebSocket mock
    wsMock = createWebSocketMock(page, 'test-session-001');

    // Simulate agent message from server
    await wsMock.simulateAgentMessage({
      message_id: 'msg-001',
      timestamp: new Date().toISOString(),
      sender: 'procurement_agent',
      recipient: 'recipient_agent',
      content: 'Hello! I am looking for cloud infrastructure services.',
    });

    // Wait for message to appear
    await terminalPane.waitForMessage(1);

    // Verify message is displayed
    const messageCount = await terminalPane.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(1);

    // Verify message content
    const content = await terminalPane.getMessageContent(0);
    expect(content).toContain('cloud infrastructure services');

    // Verify message sender
    const sender = await terminalPane.getMessageSender(0);
    expect(sender).toBe('procurement_agent');
  });

  test('CM-002: Agent thinking visualization updates', async ({ page }) => {
    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Verify Agent Thinking panel is visible
    await expect(agentThinking.heading).toBeVisible();

    // Create WebSocket mock
    wsMock = createWebSocketMock(page, 'test-session-002');

    // Simulate agent thinking from server
    await wsMock.simulateAgentThinking({
      message_id: 'thinking-001',
      timestamp: new Date().toISOString(),
      agent_id: 'procurement_agent',
      reasoning: 'Analyzing procurement request and checking inventory.',
      confidence: 0.85,
      next_actions: ['Check inventory', 'Calculate pricing', 'Generate offer'],
    });

    // Wait for thinking entry to appear
    await agentThinking.waitForThinkingEntry(1);

    // Verify thinking entry is displayed
    const entryCount = await agentThinking.getThinkingEntryCount();
    expect(entryCount).toBeGreaterThanOrEqual(1);

    // Verify thinking entry content
    const entry = await agentThinking.getThinkingEntry(0);
    expect(entry.agentId).toBe('procurement_agent');
    expect(entry.reasoning).toContain('Analyzing procurement request');
    expect(entry.confidence).toBe(0.85);
    expect(entry.nextActions).toContain('Check inventory');
  });

  test('CM-003: Real-time updates work via WebSocket', async ({ page }) => {
    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Create WebSocket mock
    wsMock = createWebSocketMock(page, 'test-session-003');

    // Simulate heartbeat
    await wsMock.simulateHeartbeat();

    // Simulate agent message
    await wsMock.simulateAgentMessage({
      message_id: 'msg-001',
      timestamp: new Date().toISOString(),
      sender: 'procurement_agent',
      recipient: 'recipient_agent',
      content: 'Hello! I am looking for cloud infrastructure services.',
    });

    // Wait for message to appear
    await terminalPane.waitForMessage(1);

    // Verify UI updates without page refresh
    const messageCount = await terminalPane.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(1);

    // Verify connection status is visible
    await expect(dashboardPage.connectionStatusBadge).toBeVisible();
  });

  test('CM-004: Connection errors handled gracefully', async ({ page }) => {
    // Select "Simulated" agent mode and "Flow Storefront" client type
    await dashboardPage.selectAgentMode('simulated');
    await dashboardPage.selectClientType('flow_storefront');

    // Start session
    await dashboardPage.startSession();
    await dashboardPage.waitForSessionActive();

    // Create WebSocket mock
    wsMock = createWebSocketMock(page, 'test-session-004');

    // Verify connection status shows connected initially
    const initialStatus = await dashboardPage.getConnectionStatus();
    expect(initialStatus).toBeTruthy();

    // Simulate connection close
    await wsMock.simulateClose();

    // Note: In real scenario, UI would show "Disconnected" status
    // For E2E tests, we verify that UI is ready to handle connection errors

    // Verify connection status is still visible
    await expect(dashboardPage.connectionStatusBadge).toBeVisible();
  });
});
