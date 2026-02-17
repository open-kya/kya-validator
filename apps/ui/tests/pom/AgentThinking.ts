import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Agent Thinking Page Object Model
 * Encapsulates interactions with Agent Thinking component
 */
export class AgentThinking extends BasePage {
  // Component locators
  readonly heading: Locator;
  readonly emptyStateMessage: Locator;
  readonly thinkingEntries: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByText('Agent Thinking');
    this.emptyStateMessage = page.getByText('No thinking history available yet');
    this.thinkingEntries = page.locator('.space-y-3 > div.flex.items-start');
  }

  /**
   * Get thinking entry count
   */
  async getThinkingEntryCount(): Promise<number> {
    return await this.thinkingEntries.count();
  }

  /**
   * Get thinking entry by index
   */
  async getThinkingEntry(index: number): Promise<{
    agentId: string;
    reasoning: string;
    confidence: number;
    nextActions: string[];
  }> {
    const entries = await this.thinkingEntries.all();
    const entry = entries[index];

    const agentId = await entry.locator('.text-xs.font-medium').textContent();
    const reasoning = await entry.locator('.text-xs.text-gray-400.mt-1').textContent();
    const confidenceText = await entry.locator('.text-xs.text-gray-500').last().textContent();
    const confidence = confidenceText ? parseFloat(confidenceText.replace('%', '')) / 100 : 0;

    const nextActions: string[] = [];
    const actionItems = await entry.locator('li').all();
    for (const item of actionItems) {
      const text = await item.textContent();
      if (text) nextActions.push(text);
    }

    return {
      agentId: agentId || '',
      reasoning: reasoning || '',
      confidence,
      nextActions,
    };
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyStateMessage.isVisible().catch(() => false);
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

  /**
   * Wait for thinking entry to appear
   */
  async waitForThinkingEntry(count: number, timeout = 10000) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const entries = document.querySelectorAll('.space-y-3 > div.flex.items-start');
        return entries.length >= expectedCount;
      },
      count,
      { timeout }
    );
  }
}
