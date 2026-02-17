import { Page, expect } from '@playwright/test';

/**
 * Base Page Object Model
 * Provides common functionality for all page objects
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to base URL
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string) {
    await this.page.waitForSelector(selector, { state: 'visible' });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string) {
    await this.page.waitForSelector(selector, { state: 'hidden' });
  }

  /**
   * Click button by role and name (user-facing locator)
   */
  async clickButton(name: string) {
    const button = this.page.getByRole('button', { name });
    await button.click();
  }

  /**
   * Fill text field by label (user-facing locator)
   */
  async fillByLabel(label: string, value: string) {
    const input = this.page.getByLabel(label);
    await input.fill(value);
  }

  /**
   * Get text by role (user-facing locator)
   */
  async getTextByRole(role: string, name: string) {
    const element = this.page.getByRole(role as any, { name });
    return await element.textContent();
  }

  /**
   * Wait for network idle (useful for async operations)
   */
  async waitForNetworkIdle(timeout = 5000) {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Take screenshot on failure
   */
  async screenshot() {
    return await this.page.screenshot({ fullPage: true });
  }

  /**
   * Mock network route for external dependencies
   */
  async mockRoute(url: string, handler: (route: any) => void) {
    await this.page.route(url, handler);
  }

  /**
   * Mock DID resolution endpoint
   */
  async mockDIDResolution(did: string, response: any) {
    await this.mockRoute('**/did/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock blockchain RPC endpoint
   */
  async mockBlockchainRPC(response: any) {
    await this.mockRoute('**/rpc*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock WASM initialization
   */
  async mockWASMInit() {
    await this.mockRoute('**/*.wasm', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/wasm',
        body: Buffer.from('mock-wasm-binary'),
      });
    });
  }
}
