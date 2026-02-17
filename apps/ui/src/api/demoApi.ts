/**
 * WebSocket API client for KYA Validator Demo.
 */
import {
  AgentMessage,
  AgentThinking,
  SessionStart,
  SessionEnd,
  ValidationRequest,
  ValidationResponse,
  WorkflowState,
  WorkflowStep,
  BaseMessage,
  AgentMode,
} from '../types/demoTypes';

const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8003';

export class DemoWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private sessionId: string) {}

  connect(): Promise<void> {
    const wsUrl = `${WS_URL}/ws/${this.sessionId}`;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket connection failed:', error);
          reject(new Error(`WebSocket connection failed: ${error}`));
        };

        this.ws.onclose = (event) => {
          this.stopHeartbeat();
          if (event.code !== 1000) {
            // 1000 is normal closure
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error('WebSocket connection exception:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  private handleMessage(message: BaseMessage): void {
    const handler = this.messageHandlers.get(message.message_type);
    if (handler) {
      handler(message);
    }
  }

  onMessageType(
    messageType: string,
    handler: (data: unknown) => void
  ): void {
    this.messageHandlers.set(messageType, handler);
  }

  offMessageType(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  sendAgentMessage(message: AgentMessage): void {
    this.send({
      ...message,
      message_type: 'agent_message',
    });
  }

  sendSessionStart(sessionStart: SessionStart): void {
    this.send({
      ...sessionStart,
      message_type: 'session_start',
    });
  }

  sendSessionEnd(sessionEnd: SessionEnd): void {
    this.send({
      ...sessionEnd,
      message_type: 'session_end',
    });
  }

  sendValidationRequest(request: ValidationRequest): void {
    this.send({
      ...request,
      message_type: 'validation_request',
    });
  }

  sendWorkflowTransition(workflowId: string, targetState: string): void {
    this.send({
      workflow_id: workflowId,
      target_state: targetState,
    });
  }

  private send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ message_type: 'heartbeat' });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnect failed:', error);
        });
      }, this.reconnectDelay);
    }
  }
}

// REST API client
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8003';

export const demoApi = {
  async getConfig(): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/v1/config`);
    return response.json();
  },

  async startSession(sessionStart: SessionStart): Promise<Record<string, unknown>> {
    // Ensure backward compatibility: if only legacy agent_mode is set, map to both roles
    const payload = { ...sessionStart };
    if (payload.procurement_mode === undefined && payload.recipient_mode === undefined) {
      payload.procurement_mode = payload.agent_mode || AgentMode.LLM;
      payload.recipient_mode = payload.agent_mode || AgentMode.LLM;
    }
    // Remove legacy agent_mode from payload to let backend use role-specific ones
    delete payload.agent_mode;

    const response = await fetch(`${API_URL}/api/v1/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async getSession(sessionId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/v1/session/${sessionId}`);
    return response.json();
  },

  async endSession(sessionId: string, sessionEnd: SessionEnd): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/v1/session/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionEnd),
    });
    return response.json();
  },

  async getMessages(sessionId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/v1/session/${sessionId}/messages`);
    return response.json();
  },

  async sendAgentMessage(
    sessionId: string,
    message: AgentMessage
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/v1/session/${sessionId}/agent/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    const result = await response.json();
    
    // Handle new exchange response format from backend
    // Backend returns: { exchange_status, visible_reason, exchange_metadata, incoming_message?, procurement_message?, recipient_message? }
    if (result && typeof result === 'object' && 'exchange_status' in result) {
      return result;
    }
    
    // Fallback to legacy format
    return result;
  },

  async getAgentThinking(sessionId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/v1/session/${sessionId}/agent/thinking`, {
      method: 'POST',
    });
    return response.json();
  },

  async validateManifest(request: ValidationRequest): Promise<ValidationResponse> {
    const response = await fetch(`${API_URL}/api/v1/validate/manifest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  },

  async workflowTransition(
    workflowId: string,
    targetState: string
  ): Promise<WorkflowStep> {
    const url = new URL(`${API_URL}/api/v1/workflow/${workflowId}/transition`);
    url.searchParams.append('target_state', targetState);
    const response = await fetch(url.toString(), {
      method: 'POST',
    });
    return response.json();
  },

  async setScenario(
    sessionId: string,
    scenarioType: string,
    parameters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/v1/scenario/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        scenario_type: scenarioType,
        parameters,
      }),
    });
    return response.json();
  },

  async updateSessionMode(
    sessionId: string,
    mode: string
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/v1/session/${sessionId}/mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode),
    });
    return response.json();
  },
};
