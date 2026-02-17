import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DemoWebSocketClient } from '../../src/api/demoApi';
import {
  mockAgentMessage,
  mockAgentThinking,
  mockValidationResponse,
  mockWorkflowState,
  mockWebSocketMessages,
} from '../fixtures/demoFixtures';

// Mock WebSocket for testing
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  
  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    // Default to abnormal closure code (1006) to trigger reconnection in tests
    // unless explicitly set to 1000 (normal closure)
    const closeCode = code !== undefined ? code : 1006;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: closeCode, reason: reason || '' }));
    }
  }

  // Simulate receiving a message
  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Simulate connection opening
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  // Simulate connection error
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock global WebSocket
vi.stubGlobal('WebSocket', MockWebSocket as any);

describe('DemoWebSocketClient', () => {
  let client: DemoWebSocketClient;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    client = new DemoWebSocketClient('session-123');
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
    vi.restoreAllMocks();
  });

  describe('Connection', () => {
    it('should create WebSocket connection with correct URL', async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;
      expect(mockWs.url).toContain('session-123');
    });

    it('should resolve promise on successful connection', async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await expect(connectPromise).resolves.toBeUndefined();
    });

    it('should reject promise on connection error', async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateError();
      await expect(connectPromise).rejects.toBeDefined();
    });

    it('should set readyState to OPEN on successful connection', async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
    });
  });

  describe('Message Routing', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should register message type handler', () => {
      const handler = vi.fn();
      client.onMessageType('agent_message', handler);
      // Trigger handler by simulating message
      mockWs.simulateMessage(mockWebSocketMessages.agent_message);
      expect(handler).toHaveBeenCalled();
    });

    it('should route agent_message to correct handler', async () => {
      const agentHandler = vi.fn();
      const otherHandler = vi.fn();
      client.onMessageType('agent_message', agentHandler);
      client.onMessageType('agent_thinking', otherHandler);
      mockWs.simulateMessage(mockWebSocketMessages.agent_message);
      expect(agentHandler).toHaveBeenCalled();
      expect(otherHandler).not.toHaveBeenCalled();
    });

    it('should route agent_thinking to correct handler', async () => {
      const thinkingHandler = vi.fn();
      const otherHandler = vi.fn();
      client.onMessageType('agent_thinking', thinkingHandler);
      client.onMessageType('agent_message', otherHandler);
      mockWs.simulateMessage(mockWebSocketMessages.agent_thinking);
      expect(thinkingHandler).toHaveBeenCalled();
      expect(otherHandler).not.toHaveBeenCalled();
    });

    it('should route validation_result to correct handler', async () => {
      const validationHandler = vi.fn();
      const otherHandler = vi.fn();
      client.onMessageType('validation_result', validationHandler);
      client.onMessageType('agent_message', otherHandler);
      mockWs.simulateMessage(mockWebSocketMessages.validation_result);
      expect(validationHandler).toHaveBeenCalled();
      expect(otherHandler).not.toHaveBeenCalled();
    });

    it('should route workflow_state to correct handler', async () => {
      const workflowHandler = vi.fn();
      const otherHandler = vi.fn();
      client.onMessageType('workflow_state', workflowHandler);
      client.onMessageType('agent_message', otherHandler);
      mockWs.simulateMessage(mockWebSocketMessages.workflow_state);
      expect(workflowHandler).toHaveBeenCalled();
      expect(otherHandler).not.toHaveBeenCalled();
    });

    it('should parse JSON messages correctly', async () => {
      const handler = vi.fn();
      client.onMessageType('agent_message', handler);
      mockWs.simulateMessage(mockWebSocketMessages.agent_message);
      const parsedMessage = JSON.parse(mockWebSocketMessages.agent_message);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining(parsedMessage));
    });

    it('should handle multiple message type handlers', async () => {
      const agentHandler = vi.fn();
      const thinkingHandler = vi.fn();
      const validationHandler = vi.fn();
      client.onMessageType('agent_message', agentHandler);
      client.onMessageType('agent_thinking', thinkingHandler);
      client.onMessageType('validation_result', validationHandler);

      mockWs.simulateMessage(mockWebSocketMessages.agent_message);
      mockWs.simulateMessage(mockWebSocketMessages.agent_thinking);
      mockWs.simulateMessage(mockWebSocketMessages.validation_result);

      expect(agentHandler).toHaveBeenCalled();
      expect(thinkingHandler).toHaveBeenCalled();
      expect(validationHandler).toHaveBeenCalled();
    });
  });

  describe('Sending Messages', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should send agent message', () => {
      client.sendAgentMessage(mockAgentMessage);
      const sentMessage = JSON.parse(mockWs.sentMessages[0]);
      expect(sentMessage).toMatchObject({
        message_type: 'agent_message',
        sender: mockAgentMessage.sender,
        recipient: mockAgentMessage.recipient,
        content: mockAgentMessage.content,
      });
    });

    it('should send session start', () => {
      const sessionStart = {
        message_id: 'session-start-001',
        timestamp: '2024-01-15T10:00:00Z',
        message_type: 'session_start',
        session_id: 'session-123',
        agent_mode: 'simulated',
        client_type: 'flow_storefront',
      };
      client.sendSessionStart(sessionStart as any);
      const sentMessage = JSON.parse(mockWs.sentMessages[0]);
      expect(sentMessage).toMatchObject({
        message_type: 'session_start',
        session_id: 'session-123',
      });
    });

    it('should send session end', () => {
      const sessionEnd = {
        message_id: 'session-end-001',
        timestamp: '2024-01-15T11:00:00Z',
        message_type: 'session_end',
        session_id: 'session-123',
        reason: 'completed',
      };
      client.sendSessionEnd(sessionEnd as any);
      const sentMessage = JSON.parse(mockWs.sentMessages[0]);
      expect(sentMessage).toMatchObject({
        message_type: 'session_end',
        session_id: 'session-123',
      });
    });

    it('should send validation request', () => {
      const validationRequest = {
        message_id: 'validation-req-001',
        timestamp: '2024-01-15T10:30:00Z',
        message_type: 'validation_request',
        manifest_data: { id: 'manifest-001' },
        validation_type: 'full',
      };
      client.sendValidationRequest(validationRequest as any);
      const sentMessage = JSON.parse(mockWs.sentMessages[0]);
      expect(sentMessage).toMatchObject({
        message_type: 'validation_request',
        manifest_data: { id: 'manifest-001' },
      });
    });

    it('should send workflow transition', () => {
      const workflowId = 'workflow-123';
      const targetState = 'in_progress';
      client.sendWorkflowTransition(workflowId, targetState);
      const sentMessage = JSON.parse(mockWs.sentMessages[0]);
      expect(sentMessage).toMatchObject({
        workflow_id: workflowId,
        target_state: targetState,
      });
    });

    it('should not send message when WebSocket is not connected', () => {
      mockWs.readyState = MockWebSocket.CONNECTING;
      client.sendAgentMessage(mockAgentMessage);
      expect(mockWs.sentMessages).toHaveLength(0);
    });
  });

  describe('Heartbeat', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should start heartbeat interval on connection', async () => {
      vi.advanceTimersByTime(30000);
      const sentMessage = JSON.parse(mockWs.sentMessages[0]);
      expect(sentMessage).toMatchObject({
        message_type: 'heartbeat',
      });
    });

    it('should send heartbeat every 30 seconds', async () => {
      vi.advanceTimersByTime(30000);
      expect(mockWs.sentMessages.length).toBe(1);

      vi.advanceTimersByTime(30000);
      expect(mockWs.sentMessages.length).toBe(2);

      vi.advanceTimersByTime(30000);
      expect(mockWs.sentMessages.length).toBe(3);
    });
  });

  describe('Disconnection', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should close WebSocket connection', () => {
      client.disconnect();
      expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should stop heartbeat interval on disconnect', async () => {
      vi.advanceTimersByTime(30000);
      expect(mockWs.sentMessages.length).toBe(1);

      client.disconnect();

      vi.advanceTimersByTime(30000);
      expect(mockWs.sentMessages.length).toBe(1); // Should not increase
    });

    it('should clear WebSocket reference', () => {
      client.disconnect();
      // Verify internal state is cleared
      expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection on close', async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;

      // Close with abnormal code to trigger reconnection
      mockWs.close(1006);
      vi.advanceTimersByTime(3000); // Wait for reconnect delay

      // Check that a new WebSocket instance was created
      expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    });

    it('should limit reconnection attempts', async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;

      // Close with abnormal code to trigger reconnection
      mockWs.close(1006);
      vi.advanceTimersByTime(3000);

      // Each reconnection attempt creates a new instance
      // We expect initial + 5 reconnection attempts = 6 instances
      expect(MockWebSocket.instances.length).toBeLessThanOrEqual(6);
    });

    it('should not reconnect after max attempts', async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;

      // Close with abnormal code to trigger reconnection
      mockWs.close(1006);
      
      // Advance time past all reconnection attempts (5 attempts * 3 seconds each)
      vi.advanceTimersByTime(15000);

      const instanceCount = MockWebSocket.instances.length;
      vi.advanceTimersByTime(3000);

      // Should not create more instances after max attempts
      expect(MockWebSocket.instances.length).toBe(instanceCount);
    });
  });

  describe('Handler Management', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWs = MockWebSocket.instances[0];
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should remove message type handler', () => {
      const handler = vi.fn();
      client.onMessageType('agent_message', handler);
      client.offMessageType('agent_message');
      mockWs.simulateMessage(mockWebSocketMessages.agent_message);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified handler', () => {
      const agentHandler = vi.fn();
      const thinkingHandler = vi.fn();
      client.onMessageType('agent_message', agentHandler);
      client.onMessageType('agent_thinking', thinkingHandler);

      client.offMessageType('agent_message');

      mockWs.simulateMessage(mockWebSocketMessages.agent_message);
      mockWs.simulateMessage(mockWebSocketMessages.agent_thinking);

      expect(agentHandler).not.toHaveBeenCalled();
      expect(thinkingHandler).toHaveBeenCalled();
    });
  });
});
