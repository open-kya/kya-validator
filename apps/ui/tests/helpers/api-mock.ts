import { Page, Route } from '@playwright/test';

/**
 * API Mock Helper
 * Provides utilities for mocking API endpoints in tests
 */

export interface MockConfig {
  agent_mode: string;
  demo_sector: string;
  llm_provider: string;
  default_model: string;
  available_modes: string[];
  available_client_types: string[];
}

export interface MockSessionData {
  session_id: string;
  agent_mode: string;
  client_type: string;
  created_at: string;
  is_active: boolean;
}

export interface MockValidationResult {
  validation_status: string;
  validation_errors: any[];
  mcp_validated: boolean;
  tee_validated: boolean;
  blockchain_validated: boolean;
  manifest_id?: string;
  policy_id?: string;
}

/**
 * Mock the config endpoint
 */
export async function mockConfigEndpoint(
  page: Page,
  config: Partial<MockConfig> = {}
): Promise<void> {
  const defaultConfig: MockConfig = {
    agent_mode: 'simulated',
    demo_sector: 'procurement',
    llm_provider: 'openai',
    default_model: 'gpt-4',
    available_modes: ['simulated', 'llm'],
    available_client_types: ['flow_storefront', 'agent_receiver', 'doc_storefront'],
    ...config,
  };

  await page.route('**/api/v1/config', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(defaultConfig),
    });
  });
}

/**
 * Mock the session start endpoint
 */
export async function mockSessionStart(
  page: Page,
  sessionData: Partial<MockSessionData> = {}
): Promise<void> {
  const defaultSessionData: MockSessionData = {
    session_id: 'test-session-001',
    agent_mode: 'simulated',
    client_type: 'flow_storefront',
    created_at: new Date().toISOString(),
    is_active: true,
    ...sessionData,
  };

  await page.route('**/api/v1/session/start', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(defaultSessionData),
    });
  });
}

/**
 * Mock the session end endpoint
 */
export async function mockSessionEnd(page: Page): Promise<void> {
  await page.route('**/api/v1/session/*/end', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message_id: 'session-end-001',
        timestamp: new Date().toISOString(),
        message_type: 'session_end',
        session_id: 'test-session-001',
        reason: 'completed',
        final_state: {
          status: 'success',
          messages_exchanged: 5,
          final_decision: 'accept',
        },
      }),
    });
  });
}

/**
 * Mock the validation endpoint
 */
export async function mockValidationEndpoint(
  page: Page,
  validationResult: Partial<MockValidationResult> = {}
): Promise<void> {
  const defaultValidationResult: MockValidationResult = {
    validation_status: 'valid',
    validation_errors: [],
    mcp_validated: true,
    tee_validated: true,
    blockchain_validated: true,
    manifest_id: 'manifest-001',
    policy_id: 'policy-001',
    ...validationResult,
  };

  await page.route('**/api/v1/validate/manifest', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(defaultValidationResult),
    });
  });
}

/**
 * Mock backend unavailable (all API endpoints fail)
 */
export async function mockBackendUnavailable(page: Page): Promise<void> {
  await page.route('**/api/**', (route) => {
    route.abort('failed');
  });
}

/**
 * Mock network latency for API calls
 */
export async function mockNetworkLatency(
  page: Page,
  latencyMs: number
): Promise<void> {
  await page.route('**/api/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
    route.continue();
  });
}

/**
 * Mock specific API endpoint with custom handler
 */
export async function mockApiEndpoint(
  page: Page,
  urlPattern: string,
  handler: (route: Route) => void
): Promise<void> {
  await page.route(urlPattern, handler);
}

/**
 * Reset all API mocks
 */
export async function resetApiMocks(page: Page): Promise<void> {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
}
