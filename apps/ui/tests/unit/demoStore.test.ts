import { describe, it, expect, beforeEach } from 'vitest';
import { useDemoStore } from '../../src/store/demoStore';
import {
  AgentMode,
  ClientType,
  ValidationStatus,
  ExchangeStatus,
} from '../../src/types/demoTypes';
import {
  mockAgentMessage,
  mockAgentMessageSimulated,
  mockAgentThinking,
  mockValidationContextValid,
  mockWorkflowState,
  mockExchangeStatusDegraded,
  mockExchangeStatusFailed,
} from '../fixtures/demoFixtures';

describe('useDemoStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDemoStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useDemoStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.agentMode).toBe(AgentMode.LLM);
      expect(state.procurementMode).toBe(AgentMode.LLM);
      expect(state.recipientMode).toBe(AgentMode.LLM);
      expect(state.clientType).toBe(ClientType.FLOW_STOREFRONT);
      expect(state.isSessionActive).toBe(false);
      expect(state.messages).toEqual([]);
      expect(state.thinkingHistory).toEqual([]);
      expect(state.workflowState).toBeNull();
      expect(state.workflowContext).toEqual({});
      expect(state.validationContext).toBeNull();
      expect(state.exchangeStatus).toBeUndefined();
      expect(state.visibleReason).toBeUndefined();
      expect(state.isConnected).toBe(false);
      expect(state.isConnecting).toBe(false);
      expect(state.connectionError).toBeNull();
    });
  });

  describe('Session State Actions', () => {
    it('should set session ID', () => {
      useDemoStore.getState().setSessionId('session-123');
      expect(useDemoStore.getState().sessionId).toBe('session-123');
    });

    it('should set agent mode', () => {
      useDemoStore.getState().setAgentMode(AgentMode.LLM);
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.LLM);
    });

    it('should set procurement mode independently', () => {
      useDemoStore.getState().setProcurementMode(AgentMode.LLM);
      expect(useDemoStore.getState().procurementMode).toBe(AgentMode.LLM);
      // Should also update legacy agentMode for compatibility
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.LLM);
    });

    it('should set recipient mode independently', () => {
      useDemoStore.getState().setRecipientMode(AgentMode.LLM);
      expect(useDemoStore.getState().recipientMode).toBe(AgentMode.LLM);
      // Should also update legacy agentMode for compatibility
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.LLM);
    });

    it('should allow different modes for procurement and recipient', () => {
      useDemoStore.getState().setProcurementMode(AgentMode.LLM);
      useDemoStore.getState().setRecipientMode(AgentMode.SIMULATED);
      expect(useDemoStore.getState().procurementMode).toBe(AgentMode.LLM);
      expect(useDemoStore.getState().recipientMode).toBe(AgentMode.SIMULATED);
      // Legacy agentMode should follow procurement mode when set first
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.LLM);
    });

    it('should sync legacy agentMode with procurementMode when set independently', () => {
      // Start with LLM
      useDemoStore.getState().setAgentMode(AgentMode.LLM);
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.LLM);
      
      // Setting procurement mode should also update agentMode
      useDemoStore.getState().setProcurementMode(AgentMode.SIMULATED);
      expect(useDemoStore.getState().procurementMode).toBe(AgentMode.SIMULATED);
      expect(useDemoStore.getState().agentMode).toBe(AgentMode.SIMULATED);
    });

    it('should set client type', () => {
      useDemoStore.getState().setClientType(ClientType.AGENT_RECEIVER);
      expect(useDemoStore.getState().clientType).toBe(ClientType.AGENT_RECEIVER);
    });

    it('should set session active state', () => {
      useDemoStore.getState().setIsSessionActive(true);
      expect(useDemoStore.getState().isSessionActive).toBe(true);
    });
  });

  describe('Message Actions', () => {
    it('should add a message to messages array', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      const state = useDemoStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toEqual(mockAgentMessage);
    });

    it('should add multiple messages', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      useDemoStore.getState().addMessage({
        ...mockAgentMessage,
        message_id: 'msg-002',
      });
      const state = useDemoStore.getState();
      expect(state.messages).toHaveLength(2);
    });

    it('should preserve existing messages when adding new ones', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      const firstMessage = useDemoStore.getState().messages[0];
      useDemoStore.getState().addMessage({
        ...mockAgentMessage,
        message_id: 'msg-002',
      });
      const state = useDemoStore.getState();
      expect(state.messages[0]).toEqual(firstMessage);
    });
  });

  describe('Thinking Actions', () => {
    it('should add thinking to history', () => {
      useDemoStore.getState().addThinking(mockAgentThinking);
      const state = useDemoStore.getState();
      expect(state.thinkingHistory).toHaveLength(1);
      expect(state.thinkingHistory[0]).toEqual(mockAgentThinking);
    });

    it('should add multiple thinking entries', () => {
      useDemoStore.getState().addThinking(mockAgentThinking);
      useDemoStore.getState().addThinking({
        ...mockAgentThinking,
        message_id: 'thinking-002',
      });
      const state = useDemoStore.getState();
      expect(state.thinkingHistory).toHaveLength(2);
    });
  });

  describe('Workflow State Actions', () => {
    it('should set workflow state', () => {
      useDemoStore.getState().setWorkflowState('negotiation');
      expect(useDemoStore.getState().workflowState).toBe('negotiation');
    });

    it('should set workflow context', () => {
      const context = { vendor_id: 'vendor-001', total: 10000 };
      useDemoStore.getState().setWorkflowContext(context);
      expect(useDemoStore.getState().workflowContext).toEqual(context);
    });

    it('should update workflow context', () => {
      const context1 = { vendor_id: 'vendor-001' };
      const context2 = { vendor_id: 'vendor-001', total: 10000 };
      useDemoStore.getState().setWorkflowContext(context1);
      useDemoStore.getState().setWorkflowContext(context2);
      expect(useDemoStore.getState().workflowContext).toEqual(context2);
    });
  });

  describe('Validation Context Actions', () => {
    it('should set validation context', () => {
      useDemoStore.getState().setValidationContext(mockValidationContextValid);
      const state = useDemoStore.getState();
      expect(state.validationContext).toEqual(mockValidationContextValid);
    });

    it('should update validation context', () => {
      const context1 = { ...mockValidationContextValid, validation_status: ValidationStatus.PENDING };
      const context2 = { ...mockValidationContextValid, validation_status: ValidationStatus.VALID };
      useDemoStore.getState().setValidationContext(context1);
      useDemoStore.getState().setValidationContext(context2);
      expect(useDemoStore.getState().validationContext?.validation_status).toBe(ValidationStatus.VALID);
    });

    it('should clear validation context when set to null', () => {
      useDemoStore.getState().setValidationContext(mockValidationContextValid);
      expect(useDemoStore.getState().validationContext).not.toBeNull();
      useDemoStore.getState().setValidationContext(null);
      expect(useDemoStore.getState().validationContext).toBeNull();
    });
  });

  describe('Exchange Status Actions', () => {
    it('should set exchange status to degraded with reason', () => {
      useDemoStore.getState().setExchangeStatus(ExchangeStatus.DEGRADED, 'LLM fallback');
      const state = useDemoStore.getState();
      expect(state.exchangeStatus).toBe(ExchangeStatus.DEGRADED);
      expect(state.visibleReason).toBe('LLM fallback');
    });

    it('should set exchange status to failed with reason', () => {
      useDemoStore.getState().setExchangeStatus(ExchangeStatus.FAILED, 'Service unavailable');
      const state = useDemoStore.getState();
      expect(state.exchangeStatus).toBe(ExchangeStatus.FAILED);
      expect(state.visibleReason).toBe('Service unavailable');
    });

    it('should set exchange status to success without reason', () => {
      useDemoStore.getState().setExchangeStatus(ExchangeStatus.SUCCESS);
      const state = useDemoStore.getState();
      expect(state.exchangeStatus).toBe(ExchangeStatus.SUCCESS);
      expect(state.visibleReason).toBeUndefined();
    });

    it('should clear exchange status when set to undefined', () => {
      useDemoStore.getState().setExchangeStatus(ExchangeStatus.DEGRADED, 'test');
      expect(useDemoStore.getState().exchangeStatus).toBe(ExchangeStatus.DEGRADED);
      useDemoStore.getState().setExchangeStatus(undefined, undefined);
      expect(useDemoStore.getState().exchangeStatus).toBeUndefined();
      expect(useDemoStore.getState().visibleReason).toBeUndefined();
    });
  });

  describe('Connection State Actions', () => {
    it('should set connected state', () => {
      useDemoStore.getState().setIsConnected(true);
      expect(useDemoStore.getState().isConnected).toBe(true);
    });

    it('should set connecting state', () => {
      useDemoStore.getState().setIsConnecting(true);
      expect(useDemoStore.getState().isConnecting).toBe(true);
    });

    it('should set connection error', () => {
      const errorMessage = 'Connection failed';
      useDemoStore.getState().setConnectionError(errorMessage);
      expect(useDemoStore.getState().connectionError).toBe(errorMessage);
    });

    it('should clear connection error when set to null', () => {
      useDemoStore.getState().setConnectionError('Error');
      expect(useDemoStore.getState().connectionError).toBe('Error');
      useDemoStore.getState().setConnectionError(null);
      expect(useDemoStore.getState().connectionError).toBeNull();
    });
  });

  describe('Reset Action', () => {
    it('should clear session state on reset', () => {
      useDemoStore.getState().setSessionId('session-123');
      useDemoStore.getState().setIsSessionActive(true);
      useDemoStore.getState().reset();
      const state = useDemoStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.isSessionActive).toBe(false);
    });

    it('should clear messages on reset', () => {
      useDemoStore.getState().addMessage(mockAgentMessage);
      useDemoStore.getState().addThinking(mockAgentThinking);
      useDemoStore.getState().reset();
      expect(useDemoStore.getState().messages).toEqual([]);
      expect(useDemoStore.getState().thinkingHistory).toEqual([]);
    });

    it('should clear workflow state on reset', () => {
      useDemoStore.getState().setWorkflowState('negotiation');
      useDemoStore.getState().setWorkflowContext({ vendor_id: 'vendor-001' });
      useDemoStore.getState().reset();
      const state = useDemoStore.getState();
      expect(state.workflowState).toBeNull();
      expect(state.workflowContext).toEqual({});
    });

    it('should clear validation context on reset', () => {
      useDemoStore.getState().setValidationContext(mockValidationContextValid);
      useDemoStore.getState().reset();
      expect(useDemoStore.getState().validationContext).toBeNull();
    });

    it('should clear exchange status on reset', () => {
      useDemoStore.getState().setExchangeStatus(ExchangeStatus.DEGRADED, 'test reason');
      useDemoStore.getState().reset();
      expect(useDemoStore.getState().exchangeStatus).toBeUndefined();
      expect(useDemoStore.getState().visibleReason).toBeUndefined();
    });

    it('should clear connection error on reset', () => {
      useDemoStore.getState().setConnectionError('Error');
      useDemoStore.getState().reset();
      expect(useDemoStore.getState().connectionError).toBeNull();
    });

    it('should preserve agent mode, procurement/recipient modes, and client type on reset', () => {
      useDemoStore.getState().setAgentMode(AgentMode.LLM);
      useDemoStore.getState().setProcurementMode(AgentMode.LLM);
      useDemoStore.getState().setRecipientMode(AgentMode.SIMULATED);
      useDemoStore.getState().setClientType(ClientType.AGENT_RECEIVER);
      useDemoStore.getState().reset();
      const state = useDemoStore.getState();
      expect(state.agentMode).toBe(AgentMode.LLM);
      expect(state.procurementMode).toBe(AgentMode.LLM);
      expect(state.recipientMode).toBe(AgentMode.SIMULATED);
      expect(state.clientType).toBe(ClientType.AGENT_RECEIVER);
    });

    it('should perform complete reset with dual-role modes', () => {
      // Set all state values including dual-role modes
      useDemoStore.getState().setSessionId('session-123');
      useDemoStore.getState().setAgentMode(AgentMode.LLM);
      useDemoStore.getState().setProcurementMode(AgentMode.LLM);
      useDemoStore.getState().setRecipientMode(AgentMode.SIMULATED);
      useDemoStore.getState().setClientType(ClientType.AGENT_RECEIVER);
      useDemoStore.getState().setIsSessionActive(true);
      useDemoStore.getState().addMessage(mockAgentMessage);
      useDemoStore.getState().addThinking(mockAgentThinking);
      useDemoStore.getState().setWorkflowState('negotiation');
      useDemoStore.getState().setWorkflowContext({ vendor_id: 'vendor-001' });
      useDemoStore.getState().setValidationContext(mockValidationContextValid);
      useDemoStore.getState().setExchangeStatus(ExchangeStatus.DEGRADED, 'test');
      useDemoStore.getState().setIsConnected(true);
      useDemoStore.getState().setIsConnecting(false);
      useDemoStore.getState().setConnectionError('Error');

      // Reset
      useDemoStore.getState().reset();

      // Verify reset
      const state = useDemoStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.isSessionActive).toBe(false);
      expect(state.messages).toEqual([]);
      expect(state.thinkingHistory).toEqual([]);
      expect(state.workflowState).toBeNull();
      expect(state.workflowContext).toEqual({});
      expect(state.validationContext).toBeNull();
      expect(state.exchangeStatus).toBeUndefined();
      expect(state.visibleReason).toBeUndefined();
      expect(state.connectionError).toBeNull();
      // Agent mode, role-specific modes, and client type are preserved
      expect(state.agentMode).toBe(AgentMode.LLM);
      expect(state.procurementMode).toBe(AgentMode.LLM);
      expect(state.recipientMode).toBe(AgentMode.SIMULATED);
      expect(state.clientType).toBe(ClientType.AGENT_RECEIVER);
    });

    it('should perform complete reset', () => {
      // Set all state values
      useDemoStore.getState().setSessionId('session-123');
      useDemoStore.getState().setAgentMode(AgentMode.LLM);
      useDemoStore.getState().setProcurementMode(AgentMode.LLM);
      useDemoStore.getState().setRecipientMode(AgentMode.SIMULATED);
      useDemoStore.getState().setClientType(ClientType.AGENT_RECEIVER);
      useDemoStore.getState().setIsSessionActive(true);
      useDemoStore.getState().addMessage(mockAgentMessage);
      useDemoStore.getState().addThinking(mockAgentThinking);
      useDemoStore.getState().setWorkflowState('negotiation');
      useDemoStore.getState().setWorkflowContext({ vendor_id: 'vendor-001' });
      useDemoStore.getState().setValidationContext(mockValidationContextValid);
      useDemoStore.getState().setExchangeStatus(ExchangeStatus.DEGRADED, 'test');
      useDemoStore.getState().setIsConnected(true);
      useDemoStore.getState().setIsConnecting(false);
      useDemoStore.getState().setConnectionError('Error');

      // Reset
      useDemoStore.getState().reset();

      // Verify reset
      const state = useDemoStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.isSessionActive).toBe(false);
      expect(state.messages).toEqual([]);
      expect(state.thinkingHistory).toEqual([]);
      expect(state.workflowState).toBeNull();
      expect(state.workflowContext).toEqual({});
      expect(state.validationContext).toBeNull();
      expect(state.exchangeStatus).toBeUndefined();
      expect(state.visibleReason).toBeUndefined();
      expect(state.connectionError).toBeNull();
      // Agent mode, role-specific modes, and client type are preserved
      expect(state.agentMode).toBe(AgentMode.LLM);
      expect(state.procurementMode).toBe(AgentMode.LLM);
      expect(state.recipientMode).toBe(AgentMode.SIMULATED);
      expect(state.clientType).toBe(ClientType.AGENT_RECEIVER);
    });
  });

  describe('State Subscriptions', () => {
    it('should notify subscribers of state changes', () => {
      let capturedState: any = null;
      const unsubscribe = useDemoStore.subscribe((state) => {
        capturedState = state;
      });

      useDemoStore.getState().setSessionId('session-123');
      expect(capturedState?.sessionId).toBe('session-123');

      unsubscribe();
    });

    it('should allow unsubscribing from state changes', () => {
      let callCount = 0;
      const unsubscribe = useDemoStore.subscribe(() => {
        callCount++;
      });

      useDemoStore.getState().setSessionId('session-123');
      expect(callCount).toBe(1);

      unsubscribe();
      useDemoStore.getState().setSessionId('session-456');
      expect(callCount).toBe(1); // Should still be 1
    });
  });
});
