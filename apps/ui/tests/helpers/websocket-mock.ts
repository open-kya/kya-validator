import { Page } from '@playwright/test';

/**
 * WebSocket Mock Helper
 * Provides utilities for mocking WebSocket connections in tests
 */

export interface WebSocketMessage {
  message_type: string;
  [key: string]: any;
}

export class WebSocketMock {
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(private page: Page, private sessionId: string) {}

  /**
   * Mock WebSocket connection by intercepting WebSocket creation
   */
  async mockConnection() {
    const wsUrl = `ws://localhost:8003/ws/${this.sessionId}`;

    await this.page.route('**/ws/**', (route) => {
      // Don't actually connect - just mock the behavior
      route.continue();
    });

    // Inject mock WebSocket into page context
    await this.page.addInitScript(() => {
      (window as any).__mockWebSocket = true;
    });
  }

  /**
   * Register a handler for a specific message type
   */
  onMessageType(messageType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Simulate receiving a WebSocket message from the server
   */
  async simulateMessage(message: WebSocketMessage) {
    await this.page.evaluate((msg) => {
      // Find the WebSocket instance and dispatch event
      const ws = (window as any).__demoWebSocket;
      if (ws && ws.onmessage) {
        ws.onmessage({ data: JSON.stringify(msg) });
      }
    }, message);
  }

  /**
   * Simulate heartbeat message
   */
  async simulateHeartbeat() {
    await this.simulateMessage({
      message_type: 'heartbeat',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Simulate agent message
   */
  async simulateAgentMessage(message: {
    message_id: string;
    timestamp: string;
    sender: string;
    recipient: string;
    content: string;
    validation_context?: any;
  }) {
    await this.simulateMessage({
      message_type: 'agent_message',
      ...message,
    });
  }

  /**
   * Simulate agent thinking
   */
  async simulateAgentThinking(message: {
    message_id: string;
    timestamp: string;
    agent_id: string;
    reasoning: string;
    confidence: number;
    next_actions: string[];
  }) {
    await this.simulateMessage({
      message_type: 'agent_thinking',
      ...message,
    });
  }

  /**
   * Simulate validation result
   */
  async simulateValidationResult(message: {
    request_id: string;
    validation_status: string;
    errors: any[];
    warnings?: any[];
  }) {
    await this.simulateMessage({
      message_type: 'validation_result',
      ...message,
    });
  }

  /**
   * Simulate workflow state update
   */
  async simulateWorkflowState(message: {
    workflow_id: string;
    current_state: string;
    available_transitions: string[];
    context?: any;
  }) {
    await this.simulateMessage({
      message_type: 'workflow_state',
      ...message,
    });
  }

  /**
   * Simulate error message
   */
  async simulateError(message: {
    error_code: string;
    error_message: string;
    severity: string;
  }) {
    await this.simulateMessage({
      message_type: 'error',
      ...message,
    });
  }

  /**
   * Simulate connection close
   */
  async simulateClose() {
    await this.page.evaluate(() => {
      const ws = (window as any).__demoWebSocket;
      if (ws && ws.onclose) {
        ws.onclose({ code: 1000, reason: 'Normal closure' });
      }
    });
  }
}

/**
 * Create a WebSocket mock helper for a given session
 */
export function createWebSocketMock(page: Page, sessionId: string): WebSocketMock {
  return new WebSocketMock(page, sessionId);
}
