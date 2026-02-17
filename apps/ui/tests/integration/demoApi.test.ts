import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { demoApi } from '../../src/api/demoApi';
import { setupMockServer } from '../mocks/server';
import {
  mockSessionStart,
  mockSessionStartDualRole,
  mockSessionStartLegacy,
  mockSessionEnd,
  mockValidationRequest,
  mockValidationResponse,
  mockConfigResponse,
} from '../fixtures/demoFixtures';
import { AgentMode } from '../../src/types/demoTypes';

// Setup MSW server
setupMockServer();

describe('demoApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should fetch config successfully', async () => {
      const config = await demoApi.getConfig();
      expect(config).toEqual(mockConfigResponse);
    });

    it('should call correct endpoint', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      await demoApi.getConfig();
      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8003/api/v1/config');
    });
  });

  describe('startSession', () => {
    it('should start session successfully', async () => {
      const result = await demoApi.startSession(mockSessionStart);
      expect(result).toHaveProperty('session_id', mockSessionStart.session_id);
      expect(result).toHaveProperty('agent_mode', mockSessionStart.agent_mode);
      expect(result).toHaveProperty('client_type', mockSessionStart.client_type);
    });

    it('should call correct endpoint with POST', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      await demoApi.startSession(mockSessionStart);
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8003/api/v1/session/start',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should send session data in body with legacy agent_mode only', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      await demoApi.startSession(mockSessionStartLegacy);
      const call = fetchSpy.mock.calls[0] as any[];
      const body = JSON.parse(call[1]?.body);
      // Legacy mode should be mapped to both role-specific modes
      expect(body).toMatchObject({
        session_id: mockSessionStartLegacy.session_id,
        client_type: mockSessionStartLegacy.client_type,
        procurement_mode: mockSessionStartLegacy.agent_mode,
        recipient_mode: mockSessionStartLegacy.agent_mode,
      });
      // agent_mode should NOT be sent (removed for backward compatibility)
      expect(body.agent_mode).toBeUndefined();
    });

    it('should send session data in body with dual-role modes', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      await demoApi.startSession(mockSessionStartDualRole);
      const call = fetchSpy.mock.calls[0] as any[];
      const body = JSON.parse(call[1]?.body);
      expect(body).toMatchObject({
        session_id: mockSessionStartDualRole.session_id,
        procurement_mode: AgentMode.LLM,
        recipient_mode: AgentMode.SIMULATED,
      });
      // agent_mode should NOT be sent (removed for backward compatibility)
      expect(body.agent_mode).toBeUndefined();
    });

    it('should handle mixed legacy and dual-role modes', async () => {
      const mixedSession = {
        ...mockSessionStart,
        message_id: 'mixed-001',
        session_id: 'mixed-session',
        agent_mode: AgentMode.SIMULATED,
        procurement_mode: AgentMode.LLM,
        recipient_mode: AgentMode.SIMULATED,
      };
      const fetchSpy = vi.spyOn(global, 'fetch');
      await demoApi.startSession(mixedSession);
      const call = fetchSpy.mock.calls[0] as any[];
      const body = JSON.parse(call[1]?.body);
      // Dual-role modes should take precedence
      expect(body.procurement_mode).toBe(AgentMode.LLM);
      expect(body.recipient_mode).toBe(AgentMode.SIMULATED);
      expect(body.agent_mode).toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('should fetch session successfully', async () => {
      const sessionId = 'session-123';
      const result = await demoApi.getSession(sessionId);
      expect(result).toHaveProperty('session_id', sessionId);
    });

    it('should call correct endpoint', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const sessionId = 'session-123';
      await demoApi.getSession(sessionId);
      expect(fetchSpy).toHaveBeenCalledWith(`http://localhost:8003/api/v1/session/${sessionId}`);
    });
  });

  describe('endSession', () => {
    it('should end session successfully', async () => {
      const sessionId = 'session-123';
      const result = await demoApi.endSession(sessionId, mockSessionEnd);
      expect(result).toHaveProperty('session_id', sessionId);
      expect(result).toHaveProperty('status', 'ended');
    });

    it('should call correct endpoint with POST', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const sessionId = 'session-123';
      await demoApi.endSession(sessionId, mockSessionEnd);
      expect(fetchSpy).toHaveBeenCalledWith(
        `http://localhost:8003/api/v1/session/${sessionId}/end`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('getMessages', () => {
    it('should fetch messages successfully', async () => {
      const sessionId = 'session-123';
      const result = await demoApi.getMessages(sessionId);
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('total');
    });

    it('should call correct endpoint', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const sessionId = 'session-123';
      await demoApi.getMessages(sessionId);
      expect(fetchSpy).toHaveBeenCalledWith(`http://localhost:8003/api/v1/session/${sessionId}/messages`);
    });
  });

  describe('sendAgentMessage', () => {
    it('should send agent message successfully', async () => {
      const sessionId = 'session-123';
      const message = {
        message_id: 'msg-001',
        sender: 'procurement_agent',
        recipient: 'recipient_agent',
        content: 'Test message',
      };
      const result = await demoApi.sendAgentMessage(sessionId, message as any);
      expect(result).toHaveProperty('sent_at');
    });

    it('should call correct endpoint with POST', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const sessionId = 'session-123';
      const message = {
        message_id: 'msg-001',
        sender: 'procurement_agent',
        recipient: 'recipient_agent',
        content: 'Test message',
      };
      await demoApi.sendAgentMessage(sessionId, message as any);
      expect(fetchSpy).toHaveBeenCalledWith(
        `http://localhost:8003/api/v1/session/${sessionId}/agent/message`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('getAgentThinking', () => {
    it('should fetch agent thinking successfully', async () => {
      const sessionId = 'session-123';
      const result = await demoApi.getAgentThinking(sessionId);
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('confidence');
    });

    it('should call correct endpoint with POST', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const sessionId = 'session-123';
      await demoApi.getAgentThinking(sessionId);
      expect(fetchSpy).toHaveBeenCalledWith(
        `http://localhost:8003/api/v1/session/${sessionId}/agent/thinking`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('validateManifest', () => {
    it('should validate manifest successfully', async () => {
      const result = await demoApi.validateManifest(mockValidationRequest);
      expect(result).toHaveProperty('validation_status');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should return valid response for valid manifest', async () => {
      const validRequest = {
        ...mockValidationRequest,
        manifest_data: { ...mockValidationRequest.manifest_data, valid: true },
      };
      const result = await demoApi.validateManifest(validRequest);
      expect(result.validation_status).toBe('valid');
    });

    it('should return invalid response for invalid manifest', async () => {
      const invalidRequest = {
        ...mockValidationRequest,
        manifest_data: { ...mockValidationRequest.manifest_data, valid: false },
      };
      const result = await demoApi.validateManifest(invalidRequest);
      expect(result.validation_status).toBe('invalid');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should call correct endpoint with POST', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      await demoApi.validateManifest(mockValidationRequest);
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8003/api/v1/validate/manifest',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('workflowTransition', () => {
    it('should transition workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const targetState = 'in_progress';
      const result = await demoApi.workflowTransition(workflowId, targetState);
      expect(result).toHaveProperty('workflow_id', workflowId);
      expect(result).toHaveProperty('new_state', targetState);
    });

    it('should call correct endpoint with POST', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const workflowId = 'workflow-123';
      const targetState = 'in_progress';
      await demoApi.workflowTransition(workflowId, targetState);
      expect(fetchSpy).toHaveBeenCalledWith(
        `http://localhost:8003/api/v1/workflow/${workflowId}/transition?target_state=${targetState}`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should send target state as query parameter', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const workflowId = 'workflow-123';
      const targetState = 'in_progress';
      await demoApi.workflowTransition(workflowId, targetState);
      const call = fetchSpy.mock.calls[0] as any[];
      const url = call[0] as string;
      expect(url).toContain('target_state=in_progress');
    });
  });
});
