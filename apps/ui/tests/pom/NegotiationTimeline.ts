import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Negotiation Timeline Page Object Model
 * Encapsulates interactions with Negotiation Timeline component
 */
export class NegotiationTimeline extends BasePage {
  // Component locators
  readonly heading: Locator;
  readonly emptyStateMessage: Locator;
  readonly timelineItems: Locator;
  readonly totalTurnsCount: Locator;
  readonly buyerMessagesCount: Locator;
  readonly vendorMessagesCount: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByText('Negotiation History');
    this.emptyStateMessage = page.getByText('No negotiation messages yet');
    this.timelineItems = page.locator('.ml-8.space-y-6 > div.relative');
    this.totalTurnsCount = page.locator('.text-2xl.font-bold.text-slate-200').first();
    this.buyerMessagesCount = page.locator('.text-2xl.font-bold.text-cyan-400');
    this.vendorMessagesCount = page.locator('.text-2xl.font-bold.text-purple-400');
  }

  /**
   * Get total turns count
   */
  async getTotalTurns(): Promise<number> {
    const text = await this.totalTurnsCount.textContent();
    return text ? parseInt(text, 10) : 0;
  }

  /**
   * Get buyer messages count
   */
  async getBuyerMessagesCount(): Promise<number> {
    const text = await this.buyerMessagesCount.textContent();
    return text ? parseInt(text, 10) : 0;
  }

  /**
   * Get vendor messages count
   */
  async getVendorMessagesCount(): Promise<number> {
    const text = await this.vendorMessagesCount.textContent();
    return text ? parseInt(text, 10) : 0;
  }

  /**
   * Get timeline item count
   */
  async getTimelineItemCount(): Promise<number> {
    return await this.timelineItems.count();
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyStateMessage.isVisible().catch(() => false);
  }

  /**
   * Wait for timeline item to appear
   */
  async waitForTimelineItem(count: number, timeout = 10000) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const items = document.querySelectorAll('.ml-8.space-y-6 > div.relative');
        return items.length >= expectedCount;
      },
      count,
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
