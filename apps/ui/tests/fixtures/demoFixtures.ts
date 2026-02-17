import {
  AgentMessage,
  AgentThinking,
  AgentMode,
  ClientType,
  ValidationContext,
  ValidationStatus,
  ValidationError,
  WorkflowState,
  SessionStart,
  SessionEnd,
  ValidationRequest,
  ValidationResponse,
  Severity,
  MessageType,
  ExchangeStatus,
} from '../../src/types/demoTypes';

// Agent Message Fixtures
export const mockAgentMessage: AgentMessage = {
  message_id: 'msg-001',
  timestamp: '2024-01-15T10:30:00Z',
  message_type: MessageType.AGENT_MESSAGE,
  sender: 'procurement_agent',
  recipient: 'recipient_agent',
  content: 'I would like to purchase 100 units of product X.',
  validation_context: {
    validation_status: ValidationStatus.VALID,
    validation_errors: [],
    mcp_validated: true,
    tee_validated: true,
    blockchain_validated: true,
  },
  thinking_process: 'Analyzing the request for product availability.',
  // Debug metadata for AI-to-AI negotiation inspection
  prompt_used: 'PROMPT_TEMPLATE:greeting',
  input_context: {
    conversation_context: { last_message: 'Hello', last_sender: 'recipient_agent' },
    incoming_message: { content: 'Hello!', sender: 'recipient_agent' },
    agent_state: { stage: 'greeting', turn_count: 1, scenario_type: null, scenario_parameters: {} },
    pricing_context: { service_type: 'cloud infrastructure', base_price: 2.5, final_price: 2.5 },
    response_source: 'PromptManager',
  },
  // Provenance metadata - explicit visibility into AI vs simulated generation
  generation_provenance: {
    source: 'llm',
    provider: 'openai',
    model: 'gpt-4',
  },
};

export const mockAgentMessageSimulated: AgentMessage = {
  ...mockAgentMessage,
  message_id: 'msg-sim-001',
  content: 'This is a simulated response.',
  generation_provenance: {
    source: 'simulated',
    fallback_reason: 'LLM unavailable',
  },
};

export const mockAgentMessageInvalid: AgentMessage = {
  ...mockAgentMessage,
  message_id: 'msg-002',
  content: 'Invalid request with missing information.',
  validation_context: {
    validation_status: ValidationStatus.INVALID,
    validation_errors: [
      {
        code: 'MISSING_FIELD',
        message: 'Required field quantity is missing',
        severity: Severity.ERROR,
      },
    ],
    mcp_validated: false,
    tee_validated: false,
    blockchain_validated: false,
  },
};

export const mockAgentMessages: AgentMessage[] = [
  {
    ...mockAgentMessage,
    message_id: 'msg-001',
    prompt_used: 'PROMPT_TEMPLATE:greeting',
    input_context: {
      conversation_context: { last_message: 'Hello', last_sender: 'recipient_agent' },
      incoming_message: { content: 'Hello!', sender: 'recipient_agent' },
      agent_state: { stage: 'greeting', turn_count: 1, scenario_type: null, scenario_parameters: {} },
      pricing_context: { service_type: 'cloud infrastructure', base_price: 2.5, final_price: 2.5 },
      response_source: 'PromptManager',
    },
    generation_provenance: {
      source: 'llm',
      provider: 'openai',
      model: 'gpt-4',
    },
  },
  {
    ...mockAgentMessage,
    message_id: 'msg-002',
    sender: 'recipient_agent',
    recipient: 'procurement_agent',
    content: 'We can fulfill your order for 100 units of product X.',
    timestamp: '2024-01-15T10:31:00Z',
    prompt_used: 'PROMPT_TEMPLATE:product_info',
    input_context: {
      conversation_context: { last_message: mockAgentMessage.content, last_sender: 'procurement_agent' },
      incoming_message: { content: mockAgentMessage.content, sender: 'procurement_agent' },
      agent_state: { stage: 'product_info', turn_count: 1, scenario_type: null, scenario_parameters: {} },
      pricing_context: { product_type: 'GPU instances', base_price: 2.5, final_price: 2.5 },
      response_source: 'PromptManager',
    },
    generation_provenance: {
      source: 'llm',
      provider: 'openai',
      model: 'gpt-4',
    },
  },
  {
    ...mockAgentMessage,
    message_id: 'msg-003',
    sender: 'procurement_agent',
    recipient: 'recipient_agent',
    content: 'Great, please proceed with the delivery.',
    timestamp: '2024-01-15T10:32:00Z',
    prompt_used: 'FALLBACK_TEMPLATE:decision',
    input_context: {
      conversation_context: { last_message: 'We can fulfill your order...', last_sender: 'recipient_agent' },
      incoming_message: { content: 'We can fulfill your order...', sender: 'recipient_agent' },
      agent_state: { stage: 'decision', turn_count: 3, scenario_type: null, scenario_parameters: {} },
      pricing_context: { service_type: 'cloud infrastructure', base_price: 2.5, final_price: 2.5 },
      response_source: 'fallback_templates',
    },
    generation_provenance: {
      source: 'simulated',
      fallback_reason: 'LLM timeout - using fallback template',
    },
  },
];

// Agent Thinking Fixtures
export const mockAgentThinking: AgentThinking = {
  message_id: 'thinking-001',
  timestamp: '2024-01-15T10:30:00Z',
  message_type: MessageType.AGENT_THINKING,
  agent_id: 'procurement_agent',
  reasoning: 'Analyzing the procurement request and checking inventory.',
  confidence: 0.85,
  next_actions: ['Check inventory', 'Calculate pricing', 'Generate offer'],
};

export const mockAgentThinkingLowConfidence: AgentThinking = {
  ...mockAgentThinking,
  message_id: 'thinking-002',
  confidence: 0.4,
  reasoning: 'Uncertain about vendor reliability.',
  next_actions: ['Request additional information', 'Check vendor history'],
};

export const mockThinkingHistory: AgentThinking[] = [
  mockAgentThinking,
  mockAgentThinkingLowConfidence,
];

// Validation Context Fixtures
export const mockValidationContextValid: ValidationContext = {
  manifest_id: 'manifest-001',
  policy_id: 'policy-001',
  validation_status: ValidationStatus.VALID,
  validation_errors: [],
  mcp_validated: true,
  tee_validated: true,
  blockchain_validated: true,
};

export const mockValidationContextInvalid: ValidationContext = {
  manifest_id: 'manifest-002',
  policy_id: 'policy-001',
  validation_status: ValidationStatus.INVALID,
  validation_errors: [
    {
      code: 'SCHEMA_VIOLATION',
      message: 'Manifest does not conform to schema',
      severity: Severity.ERROR,
    },
    {
      code: 'TTL_EXPIRED',
      message: 'Manifest TTL has expired',
      severity: Severity.WARNING,
    },
  ],
  mcp_validated: false,
  tee_validated: true,
  blockchain_validated: false,
};

export const mockValidationContextPending: ValidationContext = {
  validation_status: ValidationStatus.PENDING,
  validation_errors: [],
  mcp_validated: false,
  tee_validated: false,
  blockchain_validated: false,
};

// Workflow State Fixtures
export const mockWorkflowState: WorkflowState = {
  message_id: 'workflow-001',
  timestamp: '2024-01-15T10:30:00Z',
  message_type: MessageType.WORKFLOW_STATE,
  workflow_id: 'procurement-flow-001',
  current_state: 'negotiation',
  available_transitions: ['accept', 'reject', 'counter'],
  context: {
    vendor_id: 'vendor-001',
    total_amount: 10000,
    currency: 'USD',
  },
};

// Session Fixtures
export const mockSessionStart: SessionStart = {
  message_id: 'session-start-001',
  timestamp: '2024-01-15T10:00:00Z',
  message_type: MessageType.SESSION_START,
  session_id: 'session-001',
  // Legacy mode
  agent_mode: AgentMode.SIMULATED,
  // Role-specific modes (new contract)
  procurement_mode: AgentMode.SIMULATED,
  recipient_mode: AgentMode.SIMULATED,
  client_type: ClientType.FLOW_STOREFRONT,
  scenario_config: {
    scenario: 'standard_procurement',
    timeout: 300,
  },
};

export const mockSessionStartDualRole: SessionStart = {
  ...mockSessionStart,
  message_id: 'session-start-002',
  session_id: 'session-002',
  procurement_mode: AgentMode.LLM,
  recipient_mode: AgentMode.SIMULATED,
};

export const mockSessionStartLegacy: SessionStart = {
  ...mockSessionStart,
  message_id: 'session-start-003',
  session_id: 'session-003',
  // Only legacy agent_mode, no role-specific modes
  agent_mode: AgentMode.LLM,
  procurement_mode: undefined,
  recipient_mode: undefined,
};

// Exchange status fixtures
export const mockExchangeStatusSuccess = {
  message_type: 'exchange_status',
  exchange_status: ExchangeStatus.SUCCESS,
};

export const mockExchangeStatusDegraded = {
  message_type: 'exchange_status',
  exchange_status: ExchangeStatus.DEGRADED,
  visible_reason: 'One or both agents fell back to simulated mode',
};

export const mockExchangeStatusFailed = {
  message_type: 'exchange_status',
  exchange_status: ExchangeStatus.FAILED,
  visible_reason: 'LLM service unavailable',
};

export const mockSessionEnd: SessionEnd = {
  message_id: 'session-end-001',
  timestamp: '2024-01-15T11:00:00Z',
  message_type: MessageType.SESSION_END,
  session_id: 'session-001',
  reason: 'completed',
  final_state: {
    status: 'success',
    messages_exchanged: 5,
    final_decision: 'accept',
  },
};

// Validation Request/Response Fixtures
export const mockValidationRequest: ValidationRequest = {
  message_id: 'validation-req-001',
  timestamp: '2024-01-15T10:30:00Z',
  message_type: MessageType.VALIDATION_REQUEST,
  manifest_data: {
    id: 'manifest-001',
    issuer: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2',
    issuance_date: '2024-01-15T10:00:00Z',
  },
  policy_data: {
    id: 'policy-001',
    rules: [
      { type: 'schema', enabled: true },
      { type: 'ttl', enabled: true },
    ],
  },
  validation_type: 'full',
};

export const mockValidationResponse: ValidationResponse = {
  message_id: 'validation-resp-001',
  timestamp: '2024-01-15T10:30:01Z',
  message_type: MessageType.VALIDATION_RESULT,
  request_id: 'validation-req-001',
  validation_status: ValidationStatus.VALID,
  errors: [],
  warnings: [],
  metadata: {
    duration_ms: 100,
    validator_version: '1.0.0',
  },
};

export const mockValidationResponseInvalid: ValidationResponse = {
  ...mockValidationResponse,
  message_id: 'validation-resp-002',
  validation_status: ValidationStatus.INVALID,
  errors: [
    {
      code: 'SCHEMA_VIOLATION',
      message: 'Invalid manifest structure',
      severity: Severity.ERROR,
    },
  ],
  warnings: [
    {
      code: 'TTL_WARNING',
      message: 'Manifest TTL expires soon',
      severity: Severity.WARNING,
    },
  ],
};

// API Response Fixtures
export const mockSessionResponse = {
  session_id: 'session-001',
  agent_mode: AgentMode.SIMULATED,
  client_type: ClientType.FLOW_STOREFRONT,
  created_at: '2024-01-15T10:00:00Z',
  is_active: true,
};

export const mockConfigResponse = {
  agent_mode: AgentMode.SIMULATED,
  demo_sector: 'procurement',
  llm_provider: 'openai',
  default_model: 'gpt-4',
  available_modes: [AgentMode.SIMULATED, AgentMode.LLM],
  available_client_types: [
    ClientType.FLOW_STOREFRONT,
    ClientType.AGENT_RECEIVER,
    ClientType.DOC_STOREFRONT,
  ],
};

// WebSocket Message Fixtures
export const mockWebSocketMessages = {
  agent_message: JSON.stringify(mockAgentMessage),
  agent_thinking: JSON.stringify(mockAgentThinking),
  validation_result: JSON.stringify(mockValidationResponse),
  workflow_state: JSON.stringify(mockWorkflowState),
  heartbeat: JSON.stringify({ message_type: 'heartbeat', timestamp: '2024-01-15T10:30:00Z' }),
  error: JSON.stringify({
    message_type: 'error',
    severity: Severity.ERROR,
    error_code: 'WS_ERROR',
    error_message: 'Connection failed',
  }),
};
