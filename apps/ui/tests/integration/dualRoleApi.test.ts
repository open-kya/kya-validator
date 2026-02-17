/**
 * Integration tests for dual-role API functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { demoApi } from '../../src/api/demoApi';
import { AgentMode, AgentMessage } from '../../src/types/demoTypes';

// Mock fetch
global.fetch = vi.fn();

describe('Dual-Role API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Start', () => {
    it('should send role-specific modes when available', async () => {
      const mockResponse = {
        session_id: 'test-session-123',
        procurement_mode: AgentMode.LLM,
        recipient_mode: AgentMode.LLM,
        agent_mode: AgentMode.LLM, // legacy compatibility
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const sessionStart = {
        message_id: 'msg-start-1',
        timestamp: '2024-01-01T12:00:00Z',
        message_type: 'session_start' as any,
        session_id: 'test-session-123',
        procurement_mode: AgentMode.LLM,
        recipient_mode: AgentMode.LLM,
        client_type: 'agent_receiver' as any,
      };

      const result = await demoApi.startSession(sessionStart);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8003/api/v1/session/start',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...sessionStart,
            procurement_mode: AgentMode.LLM,
            recipient_mode: AgentMode.LLM,
          }),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should map legacy agent_mode to both roles when role-specific modes not provided', async () => {
      const mockResponse = {
        session_id: 'test-session-456',
        procurement_mode: AgentMode.SIMULATED,
        recipient_mode: AgentMode.SIMULATED,
        agent_mode: AgentMode.SIMULATED,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const sessionStart = {
        message_id: 'msg-start-2',
        timestamp: '2024-01-01T12:00:00Z',
        message_type: 'session_start' as any,
        session_id: 'test-session-456',
        agent_mode: AgentMode.SIMULATED, // legacy mode only
        client_type: 'flow_storefront' as any,
      };

      await demoApi.startSession(sessionStart);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8003/api/v1/session/start',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: 'msg-start-2',
            timestamp: '2024-01-01T12:00:00Z',
            message_type: 'session_start',
            session_id: 'test-session-456',
            client_type: 'flow_storefront',
            procurement_mode: AgentMode.SIMULATED,
            recipient_mode: AgentMode.SIMULATED,
          }),
        }
      );
    });
  });

  describe('Send Agent Message', () => {
    it('should handle exchange response format with provenance', async () => {
      const mockExchangeResponse = {
        exchange_status: 'success',
        visible_reason: undefined,
        incoming_message: {
          message_id: 'msg-incoming-1',
          timestamp: '2024-01-01T12:00:00Z',
          message_type: 'agent_message',
          sender: 'user',
          recipient: 'procurement_agent',
          content: 'Test message',
        },
        procurement_message: {
          message_id: 'msg-proc-1',
          timestamp: '2024-01-01T12:00:01Z',
          message_type: 'agent_message',
          sender: 'procurement_agent',
          recipient: 'recipient_agent',
          content: 'Procurement response',
          generation_provenance: {
            source: 'llm',
            provider: 'openai',
            model: 'gpt-4',
          },
        },
        recipient_message: {
          message_id: 'msg-recipient-1',
          timestamp: '2024-01-01T12:00:02Z',
          message_type: 'agent_message',
          sender: 'recipient_agent',
          recipient: 'procurement_agent',
          content: 'Recipient response',
          generation_provenance: {
            source: 'llm',
            provider: 'openai',
            model: 'gpt-4',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExchangeResponse),
      });

      const message: AgentMessage = {
        message_id: 'msg-user-1',
        timestamp: '2024-01-01T12:00:00Z',
        message_type: 'agent_message',
        sender: 'user',
        recipient: 'procurement_agent',
        content: 'Test message',
      };

      const result = await demoApi.sendAgentMessage('test-session-123', message);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8003/api/v1/session/test-session-123/agent/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        }
      );

      expect(result).toEqual(mockExchangeResponse);
    });

    it('should handle degraded exchange response with fallback reason', async () => {
      const mockDegradedResponse = {
        exchange_status: 'degraded',
        visible_reason: 'OpenAI API unavailable, using simulated responses',
        incoming_message: {
          message_id: 'msg-incoming-2',
          timestamp: '2024-01-01T12:00:00Z',
          message_type: 'agent_message',
          sender: 'user',
          recipient: 'procurement_agent',
          content: 'Test message',
        },
        procurement_message: {
          message_id: 'msg-proc-2',
          timestamp: '2024-01-01T12:00:01Z',
          message_type: 'agent_message',
          sender: 'procurement_agent',
          recipient: 'recipient_agent',
          content: 'Procurement response',
          generation_provenance: {
            source: 'simulated',
            fallback_reason: 'OpenAI API key not configured',
          },
        },
        recipient_message: {
          message_id: 'msg-recipient-2',
          timestamp: '2024-01-01T12:00:02Z',
          message_type: 'agent_message',
          sender: 'recipient_agent',
          recipient: 'procurement_agent',
          content: 'Recipient response',
          generation_provenance: {
            source: 'llm',
            provider: 'openai',
            model: 'gpt-4',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDegradedResponse),
      });

      const message: AgentMessage = {
        message_id: 'msg-user-2',
        timestamp: '2024-01-01T12:00:00Z',
        message_type: 'agent_message',
        sender: 'user',
        recipient: 'procurement_agent',
        content: 'Test message',
      };

      const result = await demoApi.sendAgentMessage('test-session-123', message);

      expect(result).toEqual(mockDegradedResponse);
      expect(result.exchange_status).toBe('degraded');
      expect(result.visible_reason).toBe('OpenAI API unavailable, using simulated responses');
    });

    it('should handle failed exchange response', async () => {
      const mockFailedResponse = {
        exchange_status: 'failed',
        visible_reason: 'Both LLM providers unavailable',
        incoming_message: {
          message_id: 'msg-incoming-3',
          timestamp: '2024-01-01T12:00:00Z',
          message_type: 'agent_message',
          sender: 'user',
          recipient: 'procurement_agent',
          content: 'Test message',
        },
        procurement_message: {
          message_id: 'msg-proc-3',
          timestamp: '2024-01-01T12:00:01Z',
          message_type: 'agent_message',
          sender: 'procurement_agent',
          recipient: 'recipient_agent',
          content: 'Procurement response',
          generation_provenance: {
            source: 'simulated',
            fallback_reason: 'All LLM providers failed',
          },
        },
        recipient_message: {
          message_id: 'msg-recipient-3',
          timestamp: '2024-01-01T12:00:02Z',
          message_type: 'agent_message',
          sender: 'recipient_agent',
          recipient: 'procurement_agent',
          content: 'Recipient response',
          generation_provenance: {
            source: 'simulated',
            fallback_reason: 'All LLM providers failed',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFailedResponse),
      });

      const message: AgentMessage = {
        message_id: 'msg-user-3',
        timestamp: '2024-01-01T12:00:00Z',
        message_type: 'agent_message',
        sender: 'user',
        recipient: 'procurement_agent',
        content: 'Test message',
      };

      const result = await demoApi.sendAgentMessage('test-session-123', message);

      expect(result).toEqual(mockFailedResponse);
      expect(result.exchange_status).toBe('failed');
      expect(result.visible_reason).toBe('Both LLM providers unavailable');
    });

    it('should fallback to legacy response format if exchange_status not present', async () => {
      const mockLegacyResponse = {
        incoming_message: {
          message_id: 'msg-incoming-legacy',
          timestamp: '2024-01-01T12:00:00Z',
          message_type: 'agent_message',
          sender: 'user',
          recipient: 'procurement_agent',
          content: 'Test message',
        },
        procurement_message: {
          message_id: 'msg-proc-legacy',
          timestamp: '2024-01-01T12:00:01Z',
          message_type: 'agent_message',
          sender: 'procurement_agent',
          recipient: 'recipient_agent',
          content: 'Procurement response',
        },
        recipient_message: {
          message_id: 'msg-recipient-legacy',
          timestamp: '2024-01-01T12:00:02Z',
          message_type: 'agent_message',
          sender: 'recipient_agent',
          recipient: 'procurement_agent',
          content: 'Recipient response',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLegacyResponse),
      });

      const message: AgentMessage = {
        message_id: 'msg-user-legacy',
        timestamp: '2024-01-01T12:00:00Z',
        message_type: 'agent_message',
        sender: 'user',
        recipient: 'procurement_agent',
        content: 'Test message',
      };

      const result = await demoApi.sendAgentMessage('test-session-123', message);

      expect(result).toEqual(mockLegacyResponse);
      expect(result.exchange_status).toBeUndefined();
    });
  });

  describe('Session Mode Update', () => {
    it('should update session mode with string payload', async () => {
      const mockResponse = {
        procurement_mode: AgentMode.SIMULATED,
        recipient_mode: AgentMode.SIMULATED,
        agent_mode: AgentMode.SIMULATED,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await demoApi.updateSessionMode('test-session-123', AgentMode.SIMULATED);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8003/api/v1/session/test-session-123/mode',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(AgentMode.SIMULATED),
        }
      );

      expect(result).toEqual(mockResponse);
    });
  });
});