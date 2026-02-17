import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Terminal Pane Page Object Model
 * Encapsulates interactions with the Terminal Pane component
 */
export class TerminalPane extends BasePage {
  // Component locators
  readonly heading: Locator;
  readonly terminalContent: Locator;
  readonly emptyStateMessage: Locator;
  readonly messageCount: Locator;
  readonly connectedIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByText('Terminal');
    this.terminalContent = page.locator('.overflow-y-auto');
    this.emptyStateMessage = page.getByText('No messages yet');
    this.messageCount = page.locator('.text-slate-500').first();
    this.connectedIndicator = page.locator('.w-2.h-2.rounded-full.bg-green-500');
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    const text = await this.messageCount.textContent();
    const match = text ? text.match(/(\d+) messages/) : null;
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get all messages
   */
  async getMessages(): Promise<Locator[]> {
    return await this.terminalContent.locator('.border-l-2').all();
  }

  /**
   * Get message content by index
   */
  async getMessageContent(index: number): Promise<string> {
    const messages = await this.getMessages();
    const message = messages[index];
    const content = message.locator('.text-slate-200');
    const text = await content.textContent();
    return text || '';
  }

  /**
   * Get message sender by index
   */
  async getMessageSender(index: number): Promise<string> {
    const messages = await this.getMessages();
    const message = messages[index];
    const sender = message.locator('.font-medium');
    const text = await sender.textContent();
    return text || '';
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyStateMessage.isVisible().catch(() => false);
  }

  /**
   * Check if connected indicator is visible
   */
  async isConnectedIndicatorVisible(): Promise<boolean> {
    return await this.connectedIndicator.isVisible().catch(() => false);
  }

  /**
   * Wait for message to appear
   */
  async waitForMessage(count: number, timeout = 10000) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const messages = document.querySelectorAll('.border-l-2');
        return messages.length >= expectedCount;
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
