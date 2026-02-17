import { test, expect } from '@playwright/test';

/**
 * Demo E2E Tests
 * 
 * Tests for the KYA Validator Demo dashboard and agent-based procurement workflow.
 */

test.describe('Demo Dashboard - Basic Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to demo page
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display demo dashboard heading', async ({ page }) => {
    await expect(page.getByText('KYA Validator Demo')).toBeVisible();
    await expect(page.getByText('Agent-Based Procurement')).toBeVisible();
  });

  test('should display session configuration section', async ({ page }) => {
    await expect(page.getByText('Session Configuration')).toBeVisible();
  });

  test('should display agent mode selector', async ({ page }) => {
    await expect(page.getByLabel('Agent Mode')).toBeVisible();
  });

  test('should display client type selector', async ({ page }) => {
    await expect(page.getByLabel('Client Type')).toBeVisible();
  });

  test('should display start session button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeVisible();
  });

  test('should display tab navigation', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Workflow Flow' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Negotiation' })).toBeVisible();
  });
});

test.describe('Demo Dashboard - Session Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should start session when button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Session' }).click();
    await expect(page.getByRole('button', { name: 'End Session' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Session' })).not.toBeVisible();
  });

  test('should end session when button is clicked', async ({ page }) => {
    // Start session first
    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForTimeout(500);

    // End session
    await page.getByRole('button', { name: 'End Session' }).click();
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'End Session' })).not.toBeVisible();
  });

  test('should disable agent mode selector when session is active', async ({ page }) => {
    const agentModeSelector = page.getByLabel('Agent Mode');
    await expect(agentModeSelector).not.toBeDisabled();

    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForTimeout(500);

    await expect(agentModeSelector).toBeDisabled();
  });

  test('should disable client type selector when session is active', async ({ page }) => {
    const clientTypeSelector = page.getByLabel('Client Type');
    await expect(clientTypeSelector).not.toBeDisabled();

    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForTimeout(500);

    await expect(clientTypeSelector).toBeDisabled();
  });
});

test.describe('Demo Dashboard - Agent Mode Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should have LLM mode as default', async ({ page }) => {
    const agentModeSelector = page.getByLabel('Agent Mode');
    const value = await agentModeSelector.inputValue();
    expect(value).toBe('llm');
  });

  test('should allow switching to LLM mode', async ({ page }) => {
    const agentModeSelector = page.getByLabel('Agent Mode');
    await agentModeSelector.selectOption('llm');
    const value = await agentModeSelector.inputValue();
    expect(value).toBe('llm');
  });
});

test.describe('Demo Dashboard - Client Type Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should have flow_storefront as default', async ({ page }) => {
    const clientTypeSelector = page.getByLabel('Client Type');
    const value = await clientTypeSelector.inputValue();
    expect(value).toBe('flow_storefront');
  });

  test('should allow switching to agent_receiver', async ({ page }) => {
    const clientTypeSelector = page.getByLabel('Client Type');
    await clientTypeSelector.selectOption('agent_receiver');
    const value = await clientTypeSelector.inputValue();
    expect(value).toBe('agent_receiver');
  });

  test('should allow switching to doc_storefront', async ({ page }) => {
    const clientTypeSelector = page.getByLabel('Client Type');
    await clientTypeSelector.selectOption('doc_storefront');
    const value = await clientTypeSelector.inputValue();
    expect(value).toBe('doc_storefront');
  });
});

test.describe('Demo Dashboard - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should switch to workflow flow tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Workflow Flow' }).click();
    await expect(page.getByText('Workflow Visualization')).toBeVisible();
  });

  test('should switch to negotiation tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Negotiation' }).click();
    await expect(page.getByText('Negotiation History')).toBeVisible();
  });

  test('should switch back to dashboard tab', async ({ page }) => {
    // Switch to negotiation first
    await page.getByRole('button', { name: 'Negotiation' }).click();
    await page.waitForTimeout(300);

    // Switch back to dashboard
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByText('Agent Control Panel')).toBeVisible();
  });
});

test.describe('Demo Dashboard - Agent Control Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display agent control panel', async ({ page }) => {
    await expect(page.getByText('Agent Control Panel')).toBeVisible();
  });

  test('should show current mode indicator', async ({ page }) => {
    await expect(page.getByText('Current Mode')).toBeVisible();
    await expect(page.getByText('LLM')).toBeVisible();
  });

  test('should display send message button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
  });

  test('should display validate manifest button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Validate Manifest' })).toBeVisible();
  });

  test('should disable action buttons when session is inactive', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Validate Manifest' })).toBeDisabled();
  });

  test('should enable action buttons when session is active', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: 'Send Message' })).not.toBeDisabled();
    await expect(page.getByRole('button', { name: 'Validate Manifest' })).not.toBeDisabled();
  });
});

test.describe('Demo Dashboard - Terminal Pane', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display terminal pane', async ({ page }) => {
    await expect(page.getByText('Terminal')).toBeVisible();
  });

  test('should show empty state initially', async ({ page }) => {
    await expect(page.getByText('No messages yet')).toBeVisible();
  });

  test('should display message count', async ({ page }) => {
    await expect(page.getByText('0 messages')).toBeVisible();
  });
});

test.describe('Demo Dashboard - Policy Validation Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display policy validation status', async ({ page }) => {
    await expect(page.getByText('Policy Validation Status')).toBeVisible();
  });

  test('should show empty state initially', async ({ page }) => {
    await expect(page.getByText('No validation data available')).toBeVisible();
  });
});

test.describe('Demo Dashboard - Agent Thinking Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should not show agent thinking panel when session is inactive', async ({ page }) => {
    await expect(page.getByText('Agent Thinking')).not.toBeVisible();
  });

  test('should show agent thinking panel when session is active', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Agent Thinking')).toBeVisible();
  });
});

test.describe('Demo Dashboard - Connection Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should show disconnected status initially', async ({ page }) => {
    await expect(page.getByText('Disconnected')).toBeVisible();
  });

  test('should show green status when connected', async ({ page }) => {
    // Mock connection status by setting it in store
    await page.evaluate(() => {
      (window as any).__demoStore?.setIsConnected?.(true);
    });
    await page.waitForTimeout(300);

    await expect(page.getByText('Connected')).toBeVisible();
  });
});

test.describe('Demo Dashboard - Negotiation Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display negotiation timeline on negotiation tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Negotiation' }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Negotiation History')).toBeVisible();
  });

  test('should show empty state initially', async ({ page }) => {
    await page.getByRole('button', { name: 'Negotiation' }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('No negotiation messages yet')).toBeVisible();
  });
});

test.describe('Demo Dashboard - Complete Workflow', () => {
  test('should complete full session workflow', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /demo/i }).click();
    await page.waitForLoadState('networkidle');

    // Select agent mode
    await page.getByLabel('Agent Mode').selectOption('simulated');
    
    // Select client type
    await page.getByLabel('Client Type').selectOption('flow_storefront');
    
    // Start session
    await page.getByRole('button', { name: 'Start Session' }).click();
    await page.waitForTimeout(500);
    
    // Verify session is active
    await expect(page.getByRole('button', { name: 'End Session' })).toBeVisible();
    await expect(page.getByText('Agent Thinking')).toBeVisible();
    
    // Switch to negotiation tab
    await page.getByRole('button', { name: 'Negotiation' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Negotiation History')).toBeVisible();
    
    // End session
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'End Session' }).click();
    await page.waitForTimeout(500);
    
    // Verify session is ended
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeVisible();
    await expect(page.getByText('Agent Thinking')).not.toBeVisible();
  });
});
