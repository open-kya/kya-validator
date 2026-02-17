import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Policy Editor Page Object Model
 * Encapsulates interactions with the Policy Editor UI
 */
export class PolicyEditorPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Get policy editor heading (from component, requires policy to be loaded)
   */
  get heading() {
    return this.page.getByRole('heading', { name: 'Policy Editor' });
  }

  /**
   * Get app bar heading (always visible)
   * Note: Rendered as div by MUI Typography with component="div"
   */
  get appHeading() {
    return this.page.getByText('KYA Policy Editor');
  }

  /**
   * Get export button (download icon)
   */
  get exportButton() {
    return this.page.getByRole('button', { name: 'Export' });
  }

  /**
   * Get import button (upload icon)
   */
  get importButton() {
    return this.page.getByRole('button', { name: 'Import' });
  }

  /**
   * Get the description text field
   */
  get descriptionField() {
    return this.page.getByLabel('Description');
  }

  /**
   * Get the "Add Rule" button
   */
  get addRuleButton() {
    return this.page.getByRole('button', { name: 'Add Rule' });
  }

  /**
   * Get the "Load Preset" button
   */
  get loadPresetButton() {
    return this.page.getByRole('button', { name: 'Load Preset' });
  }

  /**
   * Get the policy name field
   */
  get policyNameField() {
    return this.page.getByLabel('Policy Name');
  }

  /**
   * Get the version field
   */
  get versionField() {
    return this.page.getByLabel('Version');
  }

  /**
   * Get the validation rules heading
   */
  get rulesHeading() {
    return this.page.getByRole('heading', { name: 'Validation Rules' });
  }

  /**
   * Get rule cards by name - finds the input element with the rule name
   */
  getRuleCard(ruleName: string) {
    // Find the input with the rule name value, then go up to the card container
    return this.page.locator(`input[value="${ruleName}"]`).locator('..').locator('..').locator('..').locator('..');
  }

  /**
   * Get delete button for a rule
   */
  getRuleDeleteButton(ruleName: string) {
    const card = this.getRuleCard(ruleName);
    return card.getByTitle('Remove Rule');
  }

  /**
   * Get toggle button for a rule
   */
  getRuleToggleButton(ruleName: string) {
    const card = this.getRuleCard(ruleName);
    // Find button with title attribute matching Disable Rule or Enable Rule
    return this.page.locator(`button[title="Disable Rule"], button[title="Enable Rule"]`).first();
  }

  /**
   * Get rule type selector for a specific rule
   */
  getRuleTypeSelector(ruleName: string) {
    const card = this.getRuleCard(ruleName);
    // Find the select element within the rule card (it's a <select> element)
    return card.locator('select');
  }

  /**
   * Get the preset menu items (adapted to new UI: preset cards are buttons)
   */
  getPresetMenuItem(presetName: string) {
    return this.page.getByRole('button', { name: presetName });
  }

  /**
   * Get the dialog title - matches either a dialog heading or the inline preset heading
   */
  get dialogTitle() {
    return this.page.locator('role=dialog >> role=heading').or(this.page.getByText('Import Policy')).or(this.page.getByText('Select a Preset Policy')).first();
  }

  /**
   * Navigate to policy editor
   */
  async goto() {
    await this.page.goto('/');
    // Wait for app bar heading (always visible)
    await expect(this.appHeading).toBeVisible();
  }

  /**
   * Fill in policy name
   */
  async fillPolicyName(name: string) {
    await this.policyNameField.fill(name);
  }

  /**
   * Fill in version
   */
  async fillVersion(version: string) {
    await this.versionField.fill(version);
  }

  /**
   * Fill in description
   */
  async fillDescription(description: string) {
    await this.descriptionField.fill(description);
  }

  /**
   * Add a new rule
   */
  async addRule() {
    await this.addRuleButton.click();
  }

  /**
   * Click add rule button and wait for new rule card
   */
  async addRuleAndWait(count: number) {
    await this.addRule();
    const ruleCards = this.page.getByText(/New Rule|Validation Check/i);
    await expect(ruleCards.nth(count)).toBeVisible();
  }

  /**
   * Delete a rule by name
   */
  async deleteRule(ruleName: string) {
    const deleteButton = this.getRuleDeleteButton(ruleName);
    await deleteButton.click();
  }

  /**
   * Toggle a rule's enabled state
   */
  async toggleRule(ruleName: string) {
    const toggleButton = this.getRuleToggleButton(ruleName);
    await toggleButton.click();
  }

  /**
   * Change rule type
   */
  async changeRuleType(ruleName: string, newType: string) {
    const selector = this.getRuleTypeSelector(ruleName);
    // Use selectOption() method which is more reliable for select elements
    // Map display name to option value
    const typeToValue: Record<string, string> = {
      'Schema Validation': 'schema',
      'Time-to-Live': 'ttl',
      'Cryptographic Verification': 'crypto',
      'TEE Evidence': 'tee',
      'Solvency Check': 'solvency',
      'Geographic Region': 'region',
      'Transaction Value': 'transaction_value',
      'Time Window': 'time_window',
      'Custom Rule': 'custom',
    };
    const value = typeToValue[newType] || newType;
    await selector.selectOption(value);
  }

  /**
   * Click load preset button
   */
  async clickLoadPreset() {
    await this.loadPresetButton.click();
  }

  /**
   * Select a preset from the modal (new UI): open modal and click preset card
   */
  async selectPreset(presetName: string) {
    await this.clickLoadPreset();
    const card = this.getPresetMenuItem(presetName);
    await expect(card).toBeVisible();
    await card.click();
  }

  /**
   * Confirm loading a preset
   * Kept for backward compatibility; new UI loads directly, so this is a no-op
   */
  async confirmPresetLoad() {
    // No-op for new inline modal flow
    return;
  }

  /**
   * Click export button
   */
  async clickExport() {
    await this.exportButton.click();
  }

  /**
   * Click import button
   */
  async clickImport() {
    await this.importButton.click();
  }

  /**
   * Fill import dialog with JSON
   */
  async fillImportDialog(json: string) {
    // The textarea doesn't have a label, so find it by placeholder
    const textarea = this.page.getByPlaceholder('{"name": "My Policy", "version": "1.0", "description": "...", "rules": []}');
    await textarea.fill(json);
  }

  /**
   * Confirm import
   */
  async confirmImport() {
    // Use more specific selector to avoid ambiguity with the main Import button
    const confirmButton = this.page.getByRole('button', { name: 'Import Policy' });
    await confirmButton.click();
  }

  /**
   * Wait for policy editor to be visible
   */
  async waitForEditor() {
    await expect(this.heading).toBeVisible();
    await expect(this.policyNameField).toBeVisible();
    await expect(this.addRuleButton).toBeVisible();
  }

  /**
   * Wait for empty state message
   */
  async waitForEmptyState() {
    await expect(
      this.page.getByText(/No policy loaded/i)
    ).toBeVisible();
  }

  /**
   * Get the number of visible rule cards
   * Count based on Paper elements containing rule information
   */
  async getRuleCount() {
    // Count rule cards by looking for Papers with Delete buttons (which only appear on rule cards)
    const deleteButtons = await this.page.$$('button[title="Remove Rule"]');
    return deleteButtons.length;
  }

  /**
   * Check if a rule card exists
   */
  async hasRule(ruleName: string) {
    const ruleCard = this.getRuleCard(ruleName);
    const isVisible = await ruleCard.isVisible().catch(() => false);
    return isVisible;
  }

  /**
   * Get the current policy name value
   */
  async getPolicyName() {
    return await this.policyNameField.inputValue();
  }

  /**
   * Get the current version value
   */
  async getVersion() {
    return await this.versionField.inputValue();
  }

  /**
   * Get the current description value
   */
  async getDescription() {
    return await this.descriptionField.inputValue();
  }

  // ========== Test Panel Methods ==========

  /**
   * Switch to the Test Validation tab
   */
  async switchToTestTab() {
    const testTab = this.page.getByRole('button', { name: 'Test Validation' });
    await testTab.click();
  }

  /**
   * Switch to the Policy Editor tab
   */
  async switchToEditorTab() {
    const editorTab = this.page.getByRole('button', { name: 'Policy Editor' });
    await editorTab.click();
  }

  /**
   * Get the manifest JSON textarea
   * Use id selector since label is only visible when no manifest is loaded
   */
  get manifestTextarea() {
    return this.page.locator('#manifest-input');
  }

  /**
   * Get the Load Manifest button
   */
  get loadManifestButton() {
    return this.page.getByRole('button', { name: /Load Manifest|Update Manifest/ });
  }

  /**
   * Get the Run Validation Test button
   */
  get runValidationButton() {
    return this.page.getByRole('button', { name: 'Run Validation Test' });
  }

  /**
   * Get the Clear Results button
   */
  get clearResultsButton() {
    return this.page.getByRole('button', { name: 'Clear Results' });
  }

  /**
   * Get the Test Results heading
   */
  get testResultsHeading() {
    return this.page.getByRole('heading', { name: 'Test Results' });
  }

  /**
   * Get validation status indicator (Valid/Invalid)
   */
  getValidationStatus() {
    return this.page.locator('.flex.items-center.gap-1.font-medium');
  }

  /**
   * Get the errors count from test results
   */
  getErrorsCount() {
    return this.page.getByText(/Errors/);
  }

  /**
   * Get the duration text from test results
   */
  getDurationText() {
    return this.page.getByText(/Duration:/);
  }

  /**
   * Load manifest JSON into the textarea
   */
  async loadManifestJson(manifestJson: string) {
    await this.manifestTextarea.fill(manifestJson);
    await this.loadManifestButton.click();
  }

  /**
   * Run validation test
   */
  async runValidation() {
    await this.runValidationButton.click();
  }

  /**
   * Clear test results
   */
  async clearTestResults() {
    await this.clearResultsButton.click();
  }

  /**
   * Check if validation passed (shows "Valid" status)
   * Uses specific selector to target the status indicator within test results
   */
  async isValidationValid() {
    // Target the status indicator within the test results section
    const status = this.page
      .locator('.flex.items-center.gap-1.font-medium')
      .locator('span.text-green-600')
      .getByText('Valid');
    return await status.isVisible().catch(() => false);
  }

  /**
   * Check if validation failed (shows "Invalid" status)
   * Uses specific selector to target the status indicator within test results
   */
  async isValidationInvalid() {
    // Target the status indicator within the test results section
    const status = this.page
      .locator('.flex.items-center.gap-1.font-medium')
      .locator('span.text-red-600')
      .getByText('Invalid');
    return await status.isVisible().catch(() => false);
  }

  /**
   * Get the total errors count from the latest test result
   */
  async getTotalErrorsCount(): Promise<number> {
    // Get the error count span next to the "Errors" label
    const errorsCount = this.page
      .locator('.text-xs.text-slate-500.block')
      .locator('..')
      .locator('.font-medium')
      .first();
    const text = await errorsCount.textContent();
    return text ? parseInt(text, 10) : 0;
  }

  /**
   * Click a generic button by text
   */
  async clickButton(buttonText: string) {
    const button = this.page.getByRole('button', { name: buttonText });
    await button.click();
  }
}
