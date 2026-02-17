import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Policy Validation Status Page Object Model
 * Encapsulates interactions with the Policy Validation Status component
 */
export class PolicyValidationStatus extends BasePage {
  // Component locators
  readonly heading: Locator;
  readonly emptyStateMessage: Locator;
  readonly overallStatusBadge: Locator;
  readonly manifestIdLabel: Locator;
  readonly manifestIdValue: Locator;
  readonly policyIdLabel: Locator;
  readonly policyIdValue: Locator;
  readonly mcpValidationSection: Locator;
  readonly mcpValidationStatus: Locator;
  readonly mcpProgressBar: Locator;
  readonly teeValidationSection: Locator;
  readonly teeValidationStatus: Locator;
  readonly teeProgressBar: Locator;
  readonly blockchainValidationSection: Locator;
  readonly blockchainValidationStatus: Locator;
  readonly blockchainProgressBar: Locator;
  readonly validationErrorsSection: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByText('Policy Validation Status');
    this.emptyStateMessage = page.getByText('No validation data available');
    this.overallStatusBadge = page.locator('.mb-6.p-4.rounded-lg');
    this.manifestIdLabel = page.getByText('Manifest ID');
    this.manifestIdValue = page.locator('.text-sm.font-mono.text-slate-200').first();
    this.policyIdLabel = page.getByText('Policy ID');
    this.policyIdValue = page.locator('.text-sm.font-mono.text-slate-200').nth(1);
    this.mcpValidationSection = page.locator('.p-3.bg-slate-700\\/50').nth(0);
    this.mcpValidationStatus = this.mcpValidationSection.locator('.text-sm.font-semibold');
    this.mcpProgressBar = this.mcpValidationSection.locator('.h-full');
    this.teeValidationSection = page.locator('.p-3.bg-slate-700\\/50').nth(1);
    this.teeValidationStatus = this.teeValidationSection.locator('.text-sm.font-semibold');
    this.teeProgressBar = this.teeValidationSection.locator('.h-full');
    this.blockchainValidationSection = page.locator('.p-3.bg-slate-700\\/50').nth(2);
    this.blockchainValidationStatus = this.blockchainValidationSection.locator('.text-sm.font-semibold');
    this.blockchainProgressBar = this.blockchainValidationSection.locator('.h-full');
    this.validationErrorsSection = page.locator('.p-3.bg-red-500\\/10');
  }

  /**
   * Get overall validation status
   */
  async getOverallStatus(): Promise<string> {
    const text = await this.overallStatusBadge.textContent();
    return text || '';
  }

  /**
   * Get MCP validation status
   */
  async getMcpValidationStatus(): Promise<string> {
    const text = await this.mcpValidationStatus.textContent();
    return text || '';
  }

  /**
   * Get TEE validation status
   */
  async getTeeValidationStatus(): Promise<string> {
    const text = await this.teeValidationStatus.textContent();
    return text || '';
  }

  /**
   * Get Blockchain validation status
   */
  async getBlockchainValidationStatus(): Promise<string> {
    const text = await this.blockchainValidationStatus.textContent();
    return text || '';
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyStateMessage.isVisible().catch(() => false);
  }

  /**
   * Check if validation errors section is visible
   */
  async hasValidationErrors(): Promise<boolean> {
    return await this.validationErrorsSection.isVisible().catch(() => false);
  }

  /**
   * Wait for validation to complete
   */
  async waitForValidationComplete(timeout = 10000) {
    await this.page.waitForFunction(
      () => {
        const status = document.querySelector('.mb-6.p-4.rounded-lg');
        if (!status) return false;
        const text = status.textContent || '';
        return text === 'VALID' || text === 'INVALID';
      },
      { timeout }
    );
  }

  /**
   * Wait for validation to start (status shows PENDING)
   */
  async waitForValidationPending(timeout = 10000) {
    await this.page.waitForFunction(
      () => {
        const status = document.querySelector('.mb-6.p-4.rounded-lg');
        if (!status) return false;
        const text = status.textContent || '';
        return text === 'PENDING';
      },
      { timeout }
    );
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
