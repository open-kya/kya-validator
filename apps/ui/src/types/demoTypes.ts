/**
 * Types for the KYA Validator Demo application.
 */

export enum AgentMode {
  LLM = 'llm',
  SIMULATED = 'simulated',
}

// Dual-role mode support: each agent role can have independent mode
export interface RoleModes {
  procurement_mode: AgentMode;
  recipient_mode: AgentMode;
}

export enum ClientType {
  FLOW_STOREFRONT = 'flow_storefront',
  AGENT_RECEIVER = 'agent_receiver',
  DOC_STOREFRONT = 'doc_storefront',
}

export enum MessageType {
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
  AGENT_THINKING = 'agent_thinking',
  AGENT_MESSAGE = 'agent_message',
  AGENT_DECISION = 'agent_decision',
  VALIDATION_REQUEST = 'validation_request',
  VALIDATION_RESULT = 'validation_result',
  WORKFLOW_STATE = 'workflow_state',
  WORKFLOW_STEP = 'workflow_step',
  NEGOTIATION_OFFER = 'negotiation_offer',
  NEGOTIATION_RESPONSE = 'negotiation_response',
  MODE_CHANGE = 'mode_change',
}

export enum ValidationStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  ERROR = 'error',
}

export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface BaseMessage {
  message_id: string;
  timestamp: string;
  message_type: MessageType;
}

export interface ValidationContext {
  manifest_id?: string;
  policy_id?: string;
  validation_status: ValidationStatus;
  validation_errors: ValidationError[];
  mcp_validated: boolean;
  tee_validated: boolean;
  blockchain_validated: boolean;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: Severity;
}

export interface AgentMessage extends BaseMessage {
  message_type: MessageType.AGENT_MESSAGE;
  sender: string;
  recipient: string;
  content: string;
  validation_context?: ValidationContext;
  thinking_process?: string;
  // Debug metadata for AI-to-AI negotiation inspection
  prompt_used?: string;
  input_context?: Record<string, unknown>;
  // Provenance metadata - explicit visibility into AI vs simulated generation
  generation_provenance?: {
    source: 'llm' | 'simulated';
    provider?: string;  // e.g., 'openai', 'glm'
    model?: string;     // e.g., 'gpt-4', 'claude-3'
    fallback_reason?: string;  // Why fell back to simulated (if applicable)
  };
}

export interface AgentThinking extends BaseMessage {
  message_type: MessageType.AGENT_THINKING;
  agent_id: string;
  reasoning: string;
  confidence: number;
  next_actions: string[];
}

export interface ValidationResponse extends BaseMessage {
  message_type: MessageType.VALIDATION_RESULT;
  request_id: string;
  validation_status: ValidationStatus;
  errors: ValidationError[];
  warnings: ValidationError[];
  metadata: Record<string, unknown>;
}

export interface WorkflowState extends BaseMessage {
  message_type: MessageType.WORKFLOW_STATE;
  workflow_id: string;
  current_state: string;
  available_transitions: string[];
  context: Record<string, unknown>;
}

export interface WorkflowStep extends BaseMessage {
  message_type: MessageType.WORKFLOW_STEP;
  workflow_id: string;
  step_name: string;
  step_status: 'started' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
}

export interface NegotiationOffer extends BaseMessage {
  message_type: MessageType.NEGOTIATION_OFFER;
  offer_id: string;
  from_agent: string;
  terms: Record<string, unknown>;
  constraints: string[];
  validation_context?: ValidationContext;
}

export interface NegotiationResponse extends BaseMessage {
  message_type: MessageType.NEGOTIATION_RESPONSE;
  offer_id: string;
  response_type: 'accept' | 'reject' | 'counter';
  counter_terms?: Record<string, unknown>;
  reasoning?: string;
  validation_context?: ValidationContext;
}

export interface SessionStart extends BaseMessage {
  message_type: MessageType.SESSION_START;
  session_id: string;
  // Backward compatibility: support legacy single agent_mode
  agent_mode?: AgentMode;  // Deprecated - use role-specific modes
  procurement_mode?: AgentMode;
  recipient_mode?: AgentMode;
  client_type: ClientType;
  scenario_config?: Record<string, unknown>;
}

export interface SessionEnd extends BaseMessage {
  message_type: MessageType.SESSION_END;
  session_id: string;
  reason?: string;
  final_state?: Record<string, unknown>;
}

export interface ModeChange extends BaseMessage {
  message_type: MessageType.MODE_CHANGE;
  agent_mode: AgentMode;
}

export interface ErrorMessage extends BaseMessage {
  message_type: MessageType.ERROR;
  severity: Severity;
  error_code: string;
  error_message: string;
  details?: Record<string, unknown>;
}

export interface ValidationRequest extends BaseMessage {
  message_type: MessageType.VALIDATION_REQUEST;
  manifest_data: Record<string, unknown>;
  policy_data?: Record<string, unknown>;
  validation_type: string;
}

export interface ProcurementRequest {
  requirements: Record<string, unknown>;
  constraints: string[];
  preferences: Record<string, unknown>;
  budget?: number;
  deadline?: string;
}

export interface ProcurementDecision {
  decision: 'approve' | 'reject' | 'negotiate';
  vendor?: string;
  terms?: Record<string, unknown>;
  reasoning: string;
  validation_artifacts: Record<string, unknown>;
  confidence: number;
}

export interface DemoSession {
  session_id: string;
  // Legacy field for backward compatibility
  agent_mode: AgentMode;
  // Role-specific modes (new contract)
  procurement_mode: AgentMode;
  recipient_mode: AgentMode;
  client_type: ClientType;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  current_turn: number;
  workflow_state?: string;
  workflow_context: Record<string, unknown>;
  validation_context?: ValidationContext;
  message_count: number;
  // Exchange-level status (from backend negotiation contract)
  exchange_status?: 'success' | 'degraded' | 'failed';
  visible_reason?: string;
}

export interface DemoConfig {
  agent_mode: AgentMode;
  procurement_mode?: AgentMode;
  recipient_mode?: AgentMode;
  demo_sector: string;
  llm_provider: string;
  default_model: string;
}

// Exchange status enum for UI
export enum ExchangeStatus {
  SUCCESS = 'success',
  DEGRADED = 'degraded',
  FAILED = 'failed',
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
}
