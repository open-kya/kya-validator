import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Agent Control Panel Page Object Model
 * Encapsulates interactions with the Agent Control Panel component
 */
export class AgentControlPanel extends BasePage {
  // Component locators
  readonly heading: Locator;
  readonly currentModeLabel: Locator;
  readonly currentModeBadge: Locator;
  readonly modeDescription: Locator;
  readonly workflowStateLabel: Locator;
  readonly workflowStateBadge: Locator;
  readonly sendMessageButton: Locator;
  readonly validateManifestButton: Locator;
  readonly workflowContextSection: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByText('Agent Control Panel');
    this.currentModeLabel = page.getByText('Current Mode');
    this.currentModeBadge = page.locator('.px-3.py-1.rounded-full').first();
    this.modeDescription = page.locator('.text-xs.text-slate-400');
    this.workflowStateLabel = page.getByText('Workflow State');
    this.workflowStateBadge = page.locator('.inline-flex.items-center.gap-2');
    this.sendMessageButton = page.getByRole('button', { name: 'Send Message' });
    this.validateManifestButton = page.getByRole('button', { name: 'Validate Manifest' });
    this.workflowContextSection = page.getByText('Workflow Context');
  }

  /**
   * Get current mode text
   */
  async getCurrentMode(): Promise<string> {
    const text = await this.currentModeBadge.textContent();
    return text || '';
  }

  /**
   * Get workflow state text
   */
  async getWorkflowState(): Promise<string> {
    const text = await this.workflowStateBadge.textContent();
    return text || '';
  }

  /**
   * Click Send Message button
   */
  async sendMessage() {
    await this.sendMessageButton.click();
  }

  /**
   * Click Validate Manifest button
   */
  async validateManifest() {
    await this.validateManifestButton.click();
  }

  /**
   * Check if Send Message button is enabled
   */
  async isSendMessageEnabled(): Promise<boolean> {
    return await this.sendMessageButton.isEnabled();
  }

  /**
   * Check if Validate Manifest button is enabled
   */
  async isValidateManifestEnabled(): Promise<boolean> {
    return await this.validateManifestButton.isEnabled();
  }

  /**
   * Check if component is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.heading.isVisible().catch(() => false);
  }

  /**
   * Wait for component to be visible
   */
  async waitForVisible() {
    await expect(this.heading).toBeVisible();
  }
}
