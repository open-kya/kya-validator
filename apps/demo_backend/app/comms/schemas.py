"""
Communication schemas for the KYA Validator Demo.
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, List
from enum import Enum
from datetime import datetime
import uuid


class ExchangeStatus(str, Enum):
    """Status of a message exchange."""
    SUCCESS = 'success'  # Both agents produced AI-generated output as expected
    DEGRADED = 'degraded'  # One or both agents fell back to simulated mode
    FAILED = 'failed'  # Exchange failed due to AI unavailability or errors


class AgentMode(str, Enum):
    """Agent operation modes."""
    LLM = 'llm'
    SIMULATED = 'simulated'


class ClientType(str, Enum):
    """Client/recipient types."""
    FLOW_STOREFRONT = 'flow_storefront'  # Type A
    AGENT_RECEIVER = 'agent_receiver'    # Type B
    DOC_STOREFRONT = 'doc_storefront'    # Type C


class MessageType(str, Enum):
    """Message types in the communication protocol."""
    # Control messages
    SESSION_START = 'session_start'
    SESSION_END = 'session_end'
    HEARTBEAT = 'heartbeat'
    ERROR = 'error'

    # Agent messages
    AGENT_THINKING = 'agent_thinking'
    AGENT_MESSAGE = 'agent_message'
    AGENT_DECISION = 'agent_decision'

    # Validation messages
    VALIDATION_REQUEST = 'validation_request'
    VALIDATION_RESULT = 'validation_result'

    # Workflow messages
    WORKFLOW_STATE = 'workflow_state'
    WORKFLOW_STEP = 'workflow_step'

    # Negotiation messages
    NEGOTIATION_OFFER = 'negotiation_offer'
    NEGOTIATION_RESPONSE = 'negotiation_response'


class ValidationStatus(str, Enum):
    """Validation status values."""
    PENDING = 'pending'
    VALID = 'valid'
    INVALID = 'invalid'
    ERROR = 'error'


class Severity(str, Enum):
    """Error severity levels."""
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'


class BaseMessage(BaseModel):
    """Base message structure."""
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message_type: MessageType


class ValidationContext(BaseModel):
    """Validation context attached to messages."""
    manifest_id: Optional[str] = None
    policy_id: Optional[str] = None
    validation_status: ValidationStatus = ValidationStatus.PENDING
    validation_errors: List[Dict[str, Any]] = []
    mcp_validated: bool = False
    tee_validated: bool = False
    blockchain_validated: bool = False


class AgentMessage(BaseMessage):
    """Message from an agent."""
    message_type: MessageType = MessageType.AGENT_MESSAGE
    sender: str  # 'procurement_agent' or 'recipient_agent'
    recipient: str
    content: str
    validation_context: Optional[ValidationContext] = None
    thinking_process: Optional[str] = None  # For visualization
    # Debug metadata for AI-to-AI negotiation inspection
    prompt_used: Optional[str] = None  # The prompt/template used to generate this response
    input_context: Optional[Dict[str, Any]] = None  # Input context/parameters used for generation
    # Provenance metadata - explicit visibility into AI vs simulated generation
    generation_provenance: Optional[Dict[str, Any]] = None  # e.g., {"source": "llm"|"simulated", "provider": "openai"|"glm", "fallback_reason": "..."}


class AgentThinking(BaseMessage):
    """Agent thinking/reasoning update."""
    message_type: MessageType = MessageType.AGENT_THINKING
    agent_id: str
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)
    next_actions: List[str] = []


class ValidationRequest(BaseMessage):
    """Request for validation."""
    message_type: MessageType = MessageType.VALIDATION_REQUEST
    manifest_data: Dict[str, Any]
    policy_data: Optional[Dict[str, Any]] = None
    validation_type: str = 'manifest'  # 'manifest', 'policy', 'mcp', 'tee', 'blockchain'


class ValidationResponse(BaseMessage):
    """Response from validation."""
    message_type: MessageType = MessageType.VALIDATION_RESULT
    request_id: str
    validation_status: ValidationStatus
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}


class WorkflowState(BaseMessage):
    """Current workflow state."""
    message_type: MessageType = MessageType.WORKFLOW_STATE
    workflow_id: str
    current_state: str
    available_transitions: List[str] = []
    context: Dict[str, Any] = {}


class WorkflowStep(BaseMessage):
    """Workflow step completion."""
    message_type: MessageType = MessageType.WORKFLOW_STEP
    workflow_id: str
    step_name: str
    step_status: str  # 'started', 'completed', 'failed'
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class NegotiationOffer(BaseMessage):
    """Negotiation offer."""
    message_type: MessageType = MessageType.NEGOTIATION_OFFER
    offer_id: str
    from_agent: str
    terms: Dict[str, Any]
    constraints: List[str] = []
    validation_context: Optional[ValidationContext] = None


class NegotiationResponse(BaseMessage):
    """Response to negotiation offer."""
    message_type: MessageType = MessageType.NEGOTIATION_RESPONSE
    offer_id: str
    response_type: str  # 'accept', 'reject', 'counter'
    counter_terms: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = None
    validation_context: Optional[ValidationContext] = None


class SessionStart(BaseMessage):
    """Session start message."""
    message_type: MessageType = MessageType.SESSION_START
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Backward compatibility: support legacy single agent_mode
    agent_mode: Optional[AgentMode] = None  # Deprecated - use role-specific modes
    procurement_mode: Optional[AgentMode] = None
    recipient_mode: Optional[AgentMode] = None
    client_type: ClientType = ClientType.FLOW_STOREFRONT
    scenario_config: Optional[Dict[str, Any]] = None


class SessionEnd(BaseMessage):
    """Session end message."""
    message_type: MessageType = MessageType.SESSION_END
    session_id: str
    reason: Optional[str] = None
    final_state: Optional[Dict[str, Any]] = None


class ErrorMessage(BaseMessage):
    """Error message."""
    message_type: MessageType = MessageType.ERROR
    severity: Severity = Severity.ERROR
    error_code: str
    error_message: str
    details: Optional[Dict[str, Any]] = None


class ProcurementRequest(BaseModel):
    """Procurement request from client."""
    requirements: Dict[str, Any]
    constraints: List[str] = []
    preferences: Dict[str, Any] = {}
    budget: Optional[float] = None
    deadline: Optional[datetime] = None


class ExchangeStatusResponse(BaseModel):
    """Response envelope for message exchange with explicit status and provenance."""
    exchange_status: ExchangeStatus
    visible_reason: Optional[str] = None  # Human-readable explanation when not SUCCESS
    procurement_message: Dict[str, Any]
    recipient_message: Dict[str, Any]
    exchange_metadata: Dict[str, Any] = {}  # Contains per-agent provenance, turn info, etc.


class ProcurementDecision(BaseModel):
    """Final procurement decision."""
    decision: str  # 'approve', 'reject', 'negotiate'
    vendor: Optional[str] = None
    terms: Optional[Dict[str, Any]] = None
    reasoning: str
    validation_artifacts: Dict[str, Any] = {}
    confidence: float = Field(ge=0.0, le=1.0)
