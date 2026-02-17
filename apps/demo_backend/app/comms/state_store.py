"""
In-memory state store for managing sessions and conversation state.
"""
from typing import Dict, Optional, List, Any
from datetime import datetime
import asyncio
import json
from collections import defaultdict
from loguru import logger

from ..comms.schemas import (
    AgentMessage,
    ValidationContext,
    WorkflowState,
    SessionStart,
    ClientType,
    AgentMode,
)


class Session:
    """Represents a demo session."""

    def __init__(self, session_id: str, session_start: SessionStart):
        self.session_id = session_id
        self.client_type = session_start.client_type
        self.scenario_config = session_start.scenario_config or {}
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.is_active = True
        
        # Handle backward compatibility: if only legacy agent_mode is provided, map to both roles
        if session_start.procurement_mode is None and session_start.recipient_mode is None:
            # Legacy mode applies to both roles
            self.procurement_mode = session_start.agent_mode or AgentMode.SIMULATED
            self.recipient_mode = session_start.agent_mode or AgentMode.SIMULATED
        else:
            # Use role-specific modes, with fallback to SIMULATED if not specified
            self.procurement_mode = session_start.procurement_mode or AgentMode.SIMULATED
            self.recipient_mode = session_start.recipient_mode or AgentMode.SIMULATED
        
        # Legacy attribute for backward compatibility - always return the primary mode
        # For mixed modes, prefer procurement_mode as the "main" mode for legacy consumers
        self.agent_mode = self.procurement_mode

        # Conversation state
        self.messages: List[AgentMessage] = []
        self.current_turn = 0
        self.validation_context: Optional[ValidationContext] = None

        # Workflow state
        self.workflow_state: Optional[str] = None
        self.workflow_context: Dict[str, Any] = {}

        # Procurement state
        self.procurement_requirements: Dict[str, Any] = {}
        self.procurement_decision: Optional[Dict[str, Any]] = None

        # Negotiation state
        self.negotiation_history: List[Dict[str, Any]] = []
        self.negotiation_protocol = None

    def add_message(self, message: AgentMessage):
        """Add a message to the session."""
        self.messages.append(message)
        self.current_turn += 1
        self.updated_at = datetime.utcnow()

    def update_workflow_state(self, state: str, context: Optional[Dict[str, Any]] = None):
        """Update the workflow state."""
        self.workflow_state = state
        if context:
            self.workflow_context.update(context)
        self.updated_at = datetime.utcnow()

    def set_validation_context(self, context: ValidationContext):
        """Set the validation context."""
        self.validation_context = context
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary."""
        return {
            'session_id': self.session_id,
            'agent_mode': self.agent_mode.value,  # Legacy field for backward compatibility
            'procurement_mode': self.procurement_mode.value,
            'recipient_mode': self.recipient_mode.value,
            'client_type': self.client_type.value,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'is_active': self.is_active,
            'current_turn': self.current_turn,
            'workflow_state': self.workflow_state,
            'workflow_context': self.workflow_context,
            'validation_context': (
                self.validation_context.dict() if self.validation_context else None
            ),
            'message_count': len(self.messages),
        }


class StateStore:
    """In-memory state store for managing demo sessions."""

    def __init__(self):
        self.sessions: Dict[str, Session] = {}
        self.websocket_connections: Dict[str, Any] = {}
        self._lock = asyncio.Lock()

    async def create_session(self, session_id: str, session_start: SessionStart) -> Session:
        """Create a new session."""
        async with self._lock:
            session = Session(session_id, session_start)
            self.sessions[session_id] = session
            return session

    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        async with self._lock:
            return self.sessions.get(session_id)

    async def update_session(self, session_id: str, **kwargs) -> Optional[Session]:
        """Update session attributes."""
        async with self._lock:
            session = self.sessions.get(session_id)
            if session:
                for key, value in kwargs.items():
                    setattr(session, key, value)
                session.updated_at = datetime.utcnow()
            return session

    async def end_session(self, session_id: str) -> Optional[Session]:
        """End a session."""
        async with self._lock:
            session = self.sessions.get(session_id)
            if session:
                session.is_active = False
                session.updated_at = datetime.utcnow()
            return session

    async def add_message(self, session_id: str, message: AgentMessage) -> bool:
        """Add a message to a session."""
        async with self._lock:
            session = self.sessions.get(session_id)
            if session:
                session.add_message(message)
                return True
            return False

    async def get_messages(self, session_id: str) -> List[AgentMessage]:
        """Get all messages for a session."""
        async with self._lock:
            session = self.sessions.get(session_id)
            return session.messages.copy() if session else []

    async def get_active_sessions(self) -> List[Session]:
        """Get all active sessions."""
        async with self._lock:
            return [s for s in self.sessions.values() if s.is_active]

    async def cleanup_inactive_sessions(self, timeout_seconds: int = 3600):
        """Clean up inactive sessions older than timeout."""
        async with self._lock:
            now = datetime.utcnow()
            to_remove = []
            for session_id, session in self.sessions.items():
                if not session.is_active:
                    age = (now - session.updated_at).total_seconds()
                    if age > timeout_seconds:
                        to_remove.append(session_id)
            for session_id in to_remove:
                del self.sessions[session_id]

    async def register_websocket(self, session_id: str, websocket: Any):
        """Register a websocket connection for a session."""
        async with self._lock:
            self.websocket_connections[session_id] = websocket

    async def unregister_websocket(self, session_id: str):
        """Unregister a websocket connection."""
        async with self._lock:
            self.websocket_connections.pop(session_id, None)

    async def get_websocket(self, session_id: str) -> Optional[Any]:
        """Get the websocket connection for a session."""
        async with self._lock:
            return self.websocket_connections.get(session_id)

    async def set_scenario_config(self, session_id: str, scenario_type: str, parameters: Dict[str, Any]) -> bool:
        """Set scenario configuration for a session."""
        async with self._lock:
            session = self.sessions.get(session_id)
            if not session:
                return False
            
            # Update session scenario config
            session.scenario_config = {
                'scenario_id': scenario_type,
                'parameters': parameters,
            }
            session.updated_at = datetime.utcnow()
            
            logger.debug(f"Scenario {scenario_type} set for session {session_id}")
            return True

    async def get_scenario_config(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get scenario configuration for a session."""
        async with self._lock:
            session = self.sessions.get(session_id)
            if not session:
                return None
            
            return {
                'scenario_id': session.scenario_config.get('scenario_id'),
                'parameters': session.scenario_config.get('parameters', {}),
            }

    async def get_negotiation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get negotiation history for a session."""
        async with self._lock:
            session = self.sessions.get(session_id)
            if not session:
                return []
            return session.negotiation_history.copy()

    async def add_negotiation_entry(self, session_id: str, entry: Dict[str, Any]) -> bool:
        """Add a negotiation entry to a session."""
        async with self._lock:
            session = self.sessions.get(session_id)
            if not session:
                return False
            session.negotiation_history.append(entry)
            session.updated_at = datetime.utcnow()
            return True

    async def broadcast_message(self, session_id: str, message: Dict[str, Any]) -> bool:
        """Broadcast a message to a session's WebSocket connection."""
        async with self._lock:
            websocket = self.websocket_connections.get(session_id)
            if not websocket:
                logger.warning(f"No WebSocket connection for session {session_id}")
                return False
            
            try:
                # Use custom JSON encoder to handle datetime objects
                json_str = json.dumps(message, cls=DateTimeEncoder)
                await websocket.send_text(json_str)
                return True
            except Exception as e:
                logger.error(f"Failed to broadcast message to session {session_id}: {e}")
                return False


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles datetime objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


# Global state store instance
state_store = StateStore()
