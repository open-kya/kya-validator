/**
 * Zustand store for KYA Validator Demo state management.
 */
import { create } from 'zustand';
import {
  AgentMode,
  ClientType,
  AgentMessage,
  AgentThinking,
  WorkflowState,
  WorkflowStep,
  ValidationContext,
  ModeChange,
  ExchangeStatus,
} from '../types/demoTypes';
import { DemoWebSocketClient, demoApi } from '../api/demoApi';

// Local storage keys
const MESSAGES_KEY = 'kya-demo-messages';
const THINKING_KEY = 'kya-demo-thinking';

// Helper functions for localStorage
const loadMessages = (): AgentMessage[] => {
  try {
    const stored = localStorage.getItem(MESSAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveMessages = (messages: AgentMessage[]): void => {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error);
  }
};

const loadThinking = (): AgentThinking[] => {
  try {
    const stored = localStorage.getItem(THINKING_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveThinking = (thinking: AgentThinking[]): void => {
  try {
    localStorage.setItem(THINKING_KEY, JSON.stringify(thinking));
  } catch (error) {
    console.error('Failed to save thinking to localStorage:', error);
  }
};

// Prompt types
export type AgentType = 'procurement' | 'recipient';

// Scenario types
export type ScenarioType = 'desperate_buyer' | 'price_negotiation' | 'custom';

export interface ScenarioParameter {
  name: string;
  type: 'string' | 'number' | 'enum';
  defaultValue: unknown;
  description?: string;
  enumValues?: string[];
}

export interface PromptConfig {
  name: string;
  description: string;
  agentType: AgentType;
  systemPrompt: string;
  parameters: Record<string, unknown>;
  responseTemplates: Record<string, string[]>;
  version: string;
  stages?: Record<string, { template: string }>;
}

export interface PromptParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  defaultValue: unknown;
  description?: string;
  enumValues?: string[];
}

interface DemoState {
  // Session state
  sessionId: string | null;
  // Legacy single mode (for backward compatibility)
  agentMode: AgentMode;
  // Role-specific modes (new contract)
  procurementMode: AgentMode;
  recipientMode: AgentMode;
  clientType: ClientType;
  isSessionActive: boolean;

  // Messages and communication
  messages: AgentMessage[];
  thinkingHistory: AgentThinking[];

  // Workflow state
  workflowState: string | null;
  workflowContext: Record<string, unknown>;

  // Validation state
  validationContext: ValidationContext | null;

  // Exchange status (from backend negotiation contract)
  exchangeStatus?: ExchangeStatus;
  visibleReason?: string;

  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // WebSocket client
  wsClient: DemoWebSocketClient | null;

  // Prompt state
  prompts: Record<AgentType, PromptConfig[]>;
  currentPrompt: PromptConfig | null;
  selectedAgentType: AgentType;
  promptEditMode: boolean;
  promptPreviewMode: 'template' | 'rendered';
  promptParameters: Record<string, unknown>;

  // Scenario state
  currentScenario: ScenarioType | null;
  scenarioParameters: Record<string, unknown>;

  // Actions
  setSessionId: (id: string | null) => void;
  setAgentMode: (mode: AgentMode) => void;
  setProcurementMode: (mode: AgentMode) => void;
  setRecipientMode: (mode: AgentMode) => void;
  setClientType: (type: ClientType) => void;
  setIsSessionActive: (active: boolean) => void;
  addMessage: (message: AgentMessage) => void;
  addThinking: (thinking: AgentThinking) => void;
  setWorkflowState: (state: string | null) => void;
  setWorkflowContext: (context: Record<string, unknown>) => void;
  setValidationContext: (context: ValidationContext | null) => void;
  setExchangeStatus: (status?: ExchangeStatus, reason?: string) => void;
  setIsConnected: (connected: boolean) => void;
  setIsConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  
  // WebSocket actions
  connectWebSocket: (sessionId: string) => Promise<void>;
  disconnectWebSocket: () => void;
  sendMessage: (message: AgentMessage) => void;
  
  // Prompt actions
  setPrompts: (agentType: AgentType, prompts: PromptConfig[]) => void;
  loadPrompts: (agentType: AgentType) => Promise<void>;
  updatePrompt: (prompt: PromptConfig) => Promise<void>;
  selectPrompt: (prompt: PromptConfig) => void;
  setSelectedAgentType: (agentType: AgentType) => void;
  setPromptEditMode: (editMode: boolean) => void;
  setPromptPreviewMode: (mode: 'template' | 'rendered') => void;
  setPromptParameters: (params: Record<string, unknown>) => void;
  
  // Scenario actions
  setScenario: (scenario: ScenarioType) => void;
  setScenarioParameters: (params: Record<string, unknown>) => void;
  
  reset: () => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  // Initial state - load messages and thinking from localStorage
  sessionId: null,
  agentMode: AgentMode.LLM,
  procurementMode: AgentMode.LLM,
  recipientMode: AgentMode.LLM,
  clientType: ClientType.FLOW_STOREFRONT,
  isSessionActive: false,
  messages: loadMessages(),
  thinkingHistory: loadThinking(),
  workflowState: null,
  workflowContext: {},
  validationContext: null,
  exchangeStatus: undefined,
  visibleReason: undefined,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  wsClient: null,
  prompts: { procurement: [], recipient: [] },
  currentPrompt: null,
  selectedAgentType: 'procurement',
  promptEditMode: false,
  promptPreviewMode: 'template',
  promptParameters: {},
  currentScenario: null,
  scenarioParameters: {},

  // Actions
  setSessionId: (id) => set({ sessionId: id }),
  setAgentMode: async (mode) => {
    const { sessionId, isSessionActive } = get();
    
    // Update local state immediately for UI responsiveness
    set({ agentMode: mode });
    
    // If session is active, also update the backend
    if (isSessionActive && sessionId) {
      try {
        await demoApi.updateSessionMode(sessionId, mode);
        console.log(`Updated session ${sessionId} mode to ${mode}`);
      } catch (error) {
        console.error('Failed to update session mode on backend:', error);
        // Revert local state on error
        set({ agentMode: get().agentMode });
      }
    }
  },
  setProcurementMode: (mode) => {
    set({ procurementMode: mode });
    // Sync with legacy agentMode for backward compatibility
    if (get().agentMode === AgentMode.SIMULATED || get().agentMode === AgentMode.LLM) {
      set({ agentMode: mode });
    }
  },
  setRecipientMode: (mode) => {
    set({ recipientMode: mode });
  },
  setClientType: (type) => set({ clientType: type }),
  setIsSessionActive: (active) => set({ isSessionActive: active }),
  addMessage: (message) =>
    set((state) => {
      // Deduplicate messages by message_id to prevent REST+WS duplicates
      const existingMessageIds = new Set(state.messages.map(m => m.message_id));
      if (existingMessageIds.has(message.message_id)) {
        return state; // Skip duplicate
      }
      
      const newMessages = [...state.messages, message];
      saveMessages(newMessages);
      return { messages: newMessages };
    }),
  addThinking: (thinking) =>
    set((state) => {
      const newThinking = [...state.thinkingHistory, thinking];
      saveThinking(newThinking);
      return { thinkingHistory: newThinking };
    }),
  setWorkflowState: (state) => set({ workflowState: state }),
  setWorkflowContext: (context) => set({ workflowContext: context }),
  setValidationContext: (context) => set({ validationContext: context }),
  setExchangeStatus: (status?: ExchangeStatus, reason?: string) =>
    set({ exchangeStatus: status, visibleReason: reason }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnectionError: (error) => set({ connectionError: error }),

  // Prompt actions
  setPrompts: (agentType, prompts) =>
    set((state) => ({
      prompts: { ...state.prompts, [agentType]: prompts },
    })),
  
  loadPrompts: async (agentType: AgentType) => {
    try {
      const response = await fetch(`/api/v1/prompts/${agentType}`);
      if (!response.ok) {
        throw new Error(`Failed to load prompts: ${response.statusText}`);
      }
      const data = await response.json();
      get().setPrompts(agentType, data.prompts || []);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      // Set empty prompts on error
      get().setPrompts(agentType, []);
    }
  },

  updatePrompt: async (prompt: PromptConfig) => {
    try {
      const response = await fetch(
        `/api/v1/prompts/${prompt.agentType}/${encodeURIComponent(prompt.name)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(prompt),
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to update prompt: ${response.statusText}`);
      }
      // Reload prompts for this agent type
      await get().loadPrompts(prompt.agentType);
      // Update current prompt if it's the same
      if (get().currentPrompt?.name === prompt.name) {
        set({ currentPrompt: prompt });
      }
    } catch (error) {
      console.error('Failed to update prompt:', error);
      throw error;
    }
  },

  selectPrompt: (prompt: PromptConfig) => {
    set({
      currentPrompt: prompt,
      promptParameters: prompt.parameters || {},
    });
  },

  setSelectedAgentType: (agentType: AgentType) => {
    set({
      selectedAgentType: agentType,
      currentPrompt: null,
      promptParameters: {},
    });
  },

  setPromptEditMode: (editMode: boolean) => set({ promptEditMode: editMode }),

  setPromptPreviewMode: (mode: 'template' | 'rendered') =>
    set({ promptPreviewMode: mode }),

  setPromptParameters: (params: Record<string, unknown>) =>
    set({ promptParameters: params }),

  // Scenario actions
  setScenario: (scenario: ScenarioType) => set({ currentScenario: scenario }),

  setScenarioParameters: (params: Record<string, unknown>) =>
    set({ scenarioParameters: params }),

  // WebSocket actions
  connectWebSocket: async (sessionId: string) => {
    const { wsClient, disconnectWebSocket } = get();
    
    // Disconnect existing connection if any
    if (wsClient) {
      disconnectWebSocket();
    }

    set({ isConnecting: true, connectionError: null });

    try {
      const client = new DemoWebSocketClient(sessionId);
      
      // Set up message handlers
      client.onMessageType('agent_message', (data: unknown) => {
        const message = data as AgentMessage;
        get().addMessage(message);
      });

      // Handle agent_exchange messages from backend (contains procurement and recipient messages)
      client.onMessageType('agent_exchange', (data: unknown) => {
        const exchange = data as {
          message_type: string;
          exchange_status?: ExchangeStatus;
          visible_reason?: string;
          incoming_message?: AgentMessage;
          procurement_message: AgentMessage;
          recipient_message: AgentMessage;
        };
        
        // Update exchange status if provided
        if (exchange.exchange_status) {
          get().setExchangeStatus(exchange.exchange_status, exchange.visible_reason);
        }
        
        // Add incoming message if present
        if (exchange.incoming_message) {
          get().addMessage(exchange.incoming_message);
        }
        
        // Add procurement message
        get().addMessage(exchange.procurement_message);
        
        // Add recipient message
        get().addMessage(exchange.recipient_message);
      });

      client.onMessageType('agent_thinking', (data: unknown) => {
        const thinking = data as AgentThinking;
        get().addThinking(thinking);
      });

      client.onMessageType('workflow_state', (data: unknown) => {
        const workflow = data as WorkflowState;
        get().setWorkflowState(workflow.current_state);
        get().setWorkflowContext(workflow.context);
      });

      client.onMessageType('workflow_step', (data: unknown) => {
        const step = data as WorkflowStep;
        get().setWorkflowState(step.step_name);
        get().setWorkflowContext(step.result || {});
      });

      client.onMessageType('mode_change', (rawData: unknown) => {
        const data = rawData as Record<string, unknown>;
        // Handle both legacy and new role-specific mode formats
        if ('procurement_mode' in data || 'recipient_mode' in data) {
          if (data.procurement_mode) {
            set({ procurementMode: data.procurement_mode as AgentMode });
          }
          if (data.recipient_mode) {
            set({ recipientMode: data.recipient_mode as AgentMode });
          }
          // Update legacy agentMode to procurement_mode for compatibility
          if (data.procurement_mode) {
            set({ agentMode: data.procurement_mode as AgentMode });
          }
        } else {
          // Legacy mode change
          const modeChange = rawData as ModeChange;
          set({ agentMode: modeChange.agent_mode });
        }
      });

      // Handle exchange status updates (from backend negotiation contract)
      client.onMessageType('exchange_status', (data: unknown) => {
        const statusData = data as {
          message_type: string;
          exchange_status: ExchangeStatus;
          visible_reason?: string;
        };
        set({
          exchangeStatus: statusData.exchange_status,
          visibleReason: statusData.visible_reason
        });
      });

      // Handle session updates (includes role-specific modes from backend)
      client.onMessageType('session_update', (data: unknown) => {
        const sessionData = data as {
          message_type: string;
          procurement_mode?: AgentMode;
          recipient_mode?: AgentMode;
          exchange_status?: ExchangeStatus;
          visible_reason?: string;
        };
        if (sessionData.procurement_mode) {
          set({ procurementMode: sessionData.procurement_mode });
        }
        if (sessionData.recipient_mode) {
          set({ recipientMode: sessionData.recipient_mode });
        }
        if (sessionData.exchange_status) {
          set({
            exchangeStatus: sessionData.exchange_status,
            visibleReason: sessionData.visible_reason
          });
        }
      });

      // Connect
      await client.connect();
      
      set({ 
        wsClient: client, 
        isConnected: true, 
        isConnecting: false,
        connectionError: null,
      });
    } catch (error) {
      set({ 
        isConnecting: false, 
        connectionError: error instanceof Error ? error.message : 'Failed to connect',
        isConnected: false,
      });
    }
  },

  disconnectWebSocket: () => {
    const { wsClient } = get();
    if (wsClient) {
      wsClient.disconnect();
      set({ 
        wsClient: null, 
        isConnected: false, 
        isConnecting: false,
      });
    }
  },

  sendMessage: (message: AgentMessage) => {
    const { wsClient } = get();
    if (wsClient) {
      wsClient.sendAgentMessage(message);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  },

  reset: () => {
    const { wsClient, disconnectWebSocket, agentMode, procurementMode, recipientMode } = get();
    if (wsClient) {
      disconnectWebSocket();
    }
    // Clear localStorage
    try {
      localStorage.removeItem(MESSAGES_KEY);
      localStorage.removeItem(THINKING_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
    set({
      sessionId: null,
      agentMode, // Preserve legacy agent mode across session resets
      procurementMode, // Preserve role-specific modes
      recipientMode,
      isSessionActive: false,
      messages: [],
      thinkingHistory: [],
      workflowState: null,
      workflowContext: {},
      validationContext: null,
      exchangeStatus: undefined,
      visibleReason: undefined,
      connectionError: null,
      isConnected: false,
      isConnecting: false,
      wsClient: null,
      prompts: { procurement: [], recipient: [] },
      currentPrompt: null,
      selectedAgentType: 'procurement',
      promptEditMode: false,
      promptPreviewMode: 'template',
      promptParameters: {},
      currentScenario: null,
      scenarioParameters: {},
    });
  },
}));
