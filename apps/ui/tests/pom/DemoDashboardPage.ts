import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Demo Dashboard Page Object Model
 * Encapsulates interactions with the Demo Dashboard page
 */
export class DemoDashboardPage extends BasePage {
  // Page locators
  readonly heading: Locator;
  readonly subheading: Locator;
  readonly sessionConfigSection: Locator;
  readonly agentModeSelector: Locator;
  readonly clientTypeSelector: Locator;
  readonly startSessionButton: Locator;
  readonly endSessionButton: Locator;
  readonly connectionStatusBadge: Locator;
  readonly connectionStatusText: Locator;
  readonly dashboardTab: Locator;
  readonly workflowFlowTab: Locator;
  readonly negotiationTab: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'KYA Validator Demo' });
    this.subheading = page.getByText('Agent-Based Procurement');
    this.sessionConfigSection = page.getByText('Session Configuration');
    this.agentModeSelector = page.getByLabel('Agent Mode');
    this.clientTypeSelector = page.getByLabel('Client Type');
    this.startSessionButton = page.getByRole('button', { name: 'Start Session' });
    this.endSessionButton = page.getByRole('button', { name: 'End Session' });
    this.connectionStatusBadge = page.locator('.flex.items-center.gap-2');
    this.connectionStatusText = page.locator('.flex.items-center.gap-2 span:last-child');
    this.dashboardTab = page.getByRole('button', { name: 'Dashboard' });
    this.workflowFlowTab = page.getByRole('button', { name: 'Workflow Flow' });
    this.negotiationTab = page.getByRole('button', { name: 'Negotiation' });
  }

  /**
   * Navigate to the demo page
   */
  async gotoDemo() {
    await this.page.goto('/');
    await this.page.getByRole('link', { name: /demo/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select agent mode
   */
  async selectAgentMode(mode: 'simulated' | 'llm') {
    await this.agentModeSelector.selectOption(mode);
  }

  /**
   * Select client type
   */
  async selectClientType(type: 'flow_storefront' | 'agent_receiver' | 'doc_storefront') {
    await this.clientTypeSelector.selectOption(type);
  }

  /**
   * Start a session
   */
  async startSession() {
    await this.startSessionButton.click();
  }

  /**
   * End a session
   */
  async endSession() {
    await this.endSessionButton.click();
  }

  /**
   * Switch to Dashboard tab
   */
  async switchToDashboardTab() {
    await this.dashboardTab.click();
  }

  /**
   * Switch to Workflow Flow tab
   */
  async switchToWorkflowFlowTab() {
    await this.workflowFlowTab.click();
  }

  /**
   * Switch to Negotiation tab
   */
  async switchToNegotiationTab() {
    await this.negotiationTab.click();
  }

  /**
   * Get connection status text
   */
  async getConnectionStatus(): Promise<string> {
    const text = await this.connectionStatusText.textContent();
    return text || '';
  }

  /**
   * Check if session is active
   */
  async isSessionActive(): Promise<boolean> {
    return await this.endSessionButton.isVisible().catch(() => false);
  }

  /**
   * Check if connected
   */
  async isConnected(): Promise<boolean> {
    const text = await this.getConnectionStatus();
    return text === 'Connected';
  }

  /**
   * Check if disconnected
   */
  async isDisconnected(): Promise<boolean> {
    const text = await this.getConnectionStatus();
    return text === 'Disconnected';
  }

  /**
   * Get agent mode value
   */
  async getAgentMode(): Promise<string> {
    return await this.agentModeSelector.inputValue();
  }

  /**
   * Get client type value
   */
  async getClientType(): Promise<string> {
    return await this.clientTypeSelector.inputValue();
  }

  /**
   * Wait for session to be active
   */
  async waitForSessionActive() {
    await expect(this.endSessionButton).toBeVisible();
  }

  /**
   * Wait for session to end
   */
  async waitForSessionEnd() {
    await expect(this.startSessionButton).toBeVisible();
  }
}
