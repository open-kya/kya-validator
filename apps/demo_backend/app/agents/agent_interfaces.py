"""
Agent interfaces and base classes for the procurement demo.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from ..comms.schemas import (
    AgentMessage,
    AgentThinking,
    ProcurementRequest,
    ProcurementDecision,
    ValidationContext,
    AgentMode,
)
from ..llm.mcp_client import MCPClientWrapper, MCPStatus

logger = logging.getLogger(__name__)


def _debug(msg: str) -> None:
    """Best-effort debug logger that works with or without loguru installed."""
    try:
        from loguru import logger as loguru_logger

        loguru_logger.debug(msg)
    except Exception:
        logger.debug(msg)


class AgentInterface(ABC):
    """Base interface for all agents."""

    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        self.agent_id = agent_id
        self.config = config or {}
        self.created_at = datetime.utcnow()
        self.mcp_client: Optional[MCPClientWrapper] = None
        self.mcp_available = False
        self.initialize_mcp(self.config)

    @abstractmethod
    async def process_message(self, message: AgentMessage) -> AgentMessage:
        """Process an incoming message and generate a response."""
        pass

    @abstractmethod
    async def _generate_response(self, message: AgentMessage) -> str:
        """Generate the actual response content. Internal method for subclasses."""
        pass

    @abstractmethod
    async def get_thinking(self) -> AgentThinking:
        """Get the current thinking/reasoning state of the agent."""
        pass

    @abstractmethod
    def get_mode(self) -> AgentMode:
        """Get the agent's operation mode."""
        pass

    @abstractmethod
    def initialize_mcp(self, config: Dict[str, Any]) -> None:
        """Initialize MCP client if available."""
        pass

    @abstractmethod
    def get_mcp_status(self) -> MCPStatus:
        """Get current MCP status."""
        pass

    @abstractmethod
    def is_mcp_available(self) -> bool:
        """Check if MCP is available."""
        pass

    @abstractmethod
    async def execute_with_mcp(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool via MCP if available, otherwise use direct API."""
        pass


class BaseAgent(AgentInterface):
    """Base implementation of AgentInterface with MCP support."""

    def initialize_mcp(self, config: Dict[str, Any]) -> None:
        """Initialize MCP client if available."""
        try:
            from ..settings import settings

            if not settings.mcp_enabled:
                logger.info("MCP is disabled in settings")
                return

            mcp_url = config.get('mcp_server_url') or settings.mcp_server_url
            if mcp_url:
                self.mcp_client = MCPClientWrapper(
                    server_url=mcp_url,
                    timeout=settings.mcp_timeout
                )
                self.mcp_available = self.mcp_client.is_available()

                if self.mcp_available:
                    logger.info(f"Agent {self.agent_id}: MCP initialized with {len(self.mcp_client.available_tools)} tools")
                else:
                    logger.warning(f"Agent {self.agent_id}: MCP initialization failed")
            else:
                logger.info(f"Agent {self.agent_id}: No MCP server URL configured")
        except Exception as e:
            logger.error(f"Agent {self.agent_id}: MCP initialization error: {e}")
            self.mcp_available = False

    def get_mcp_status(self) -> MCPStatus:
        """Get current MCP status."""
        if self.mcp_client:
            return self.mcp_client.get_status()
        return MCPStatus(available=False, errors=["MCP client not initialized"])

    def is_mcp_available(self) -> bool:
        """Check if MCP is available."""
        return self.mcp_available

    async def execute_with_mcp(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool via MCP if available, otherwise use direct API."""
        from ..settings import settings

        if self.mcp_available and self.mcp_client:
            try:
                return await self.mcp_client.call_tool(tool_name, arguments)
            except Exception as e:
                logger.error(f"MCP tool call failed for '{tool_name}': {e}")
                if settings.mcp_fallback_to_direct:
                    logger.info(f"Falling back to direct API for '{tool_name}'")
                    return await self._execute_direct_api(tool_name, arguments)
                else:
                    raise
        else:
            return await self._execute_direct_api(tool_name, arguments)

    async def _execute_direct_api(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute tool via direct API call (to be overridden by subclasses)."""
        raise NotImplementedError(f"Direct API execution not implemented for '{tool_name}'")


class BaseProcurementAgent(BaseAgent):
    """Base procurement agent with common functionality."""

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
    ):
        """Initialize base procurement agent."""
        super().__init__('procurement_agent', config)
        self.current_thinking = ''
        self.thinking_history: List[str] = []
        self.conversation_context: Dict[str, Any] = {}
        from ..prompts import get_prompt_manager
        from ..prompts.price_catalog import get_price_catalog
        from .agent_to_validator import AgentToValidator

        self.prompt_manager = get_prompt_manager()
        self.price_catalog = get_price_catalog()
        self.agent_to_validator = AgentToValidator()
        self.scenario_type: Optional[str] = (
            config.get('scenario_type') if config else None
        )
        self.scenario_parameters: Dict[str, Any] = (
            config.get('scenario_parameters', {}) if config else {}
        )

    async def process_message(self, message: AgentMessage) -> AgentMessage:
        """Process an incoming message and generate a response."""
        self.conversation_context['last_message'] = message.content
        self.conversation_context['last_sender'] = message.sender

        # Capture input context for debug metadata
        input_context = {
            'conversation_context': self.conversation_context.copy(),
            'incoming_message': {
                'content': message.content,
                'sender': message.sender,
                'timestamp': message.timestamp.isoformat() if hasattr(message, 'timestamp') else None,
            },
            'agent_state': {
                'stage': getattr(self, 'stage', None),
                'turn_count': getattr(self, 'turn_count', None),
                'scenario_type': getattr(self, 'scenario_type', None),
                'scenario_parameters': getattr(self, 'scenario_parameters', {}),
            }
        }

        response_content = await self._generate_response(message)
        
        # Get the prompt and input context that was used (if available)
        # Subclasses should set these attributes before returning
        prompt_used = getattr(self, '_last_prompt', None)
        last_input_context = getattr(self, '_last_input_context', input_context)
        
        return AgentMessage(
            sender='procurement_agent',
            recipient=message.sender,
            content=response_content,
            validation_context=message.validation_context,
            prompt_used=prompt_used,
            input_context=last_input_context,
        )

    def _build_scenario_prompt(self, base_prompt: str) -> str:
        """Build prompt with scenario context if scenario is set."""
        if self.scenario_type and self.scenario_parameters:
            scenario_context = f"\n\nCurrent Scenario: {self.scenario_type}\n"
            scenario_context += "Scenario Parameters:\n"
            for key, value in self.scenario_parameters.items():
                scenario_context += f"  - {key}: {value}\n"
            return base_prompt + scenario_context
        return base_prompt

    async def get_thinking(self) -> AgentThinking:
        """Get the current thinking/reasoning state of the agent."""
        return AgentThinking(
            agent_id=self.agent_id,
            reasoning=self.current_thinking,
            confidence=0.85,
            next_actions=[],
        )

    def get_mode(self) -> AgentMode:
        """Get the agent's operation mode."""
        return AgentMode.SIMULATED

    async def request_encryption_challenge(
        self,
        manifest: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Request an encryption challenge from the recipient agent."""
        return self.agent_to_validator.generate_encryption_challenge(
            manifest,
        )

    async def verify_agent_to(
        self,
        encrypted_nonce: str,
        original_nonce: str,
        manifest: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Verify agent-to encryption."""
        return self.agent_to_validator.validate_agent_to(
            original_nonce,
            encrypted_nonce,
            manifest,
        )


class BaseRecipientAgent(BaseAgent):
    """Base recipient agent with common functionality."""

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
    ):
        """Initialize base recipient agent."""
        super().__init__('recipient_agent', config)
        self.current_thinking = ''
        self.thinking_history: List[str] = []
        self.conversation_context: Dict[str, Any] = {}
        from ..prompts import get_prompt_manager
        from ..prompts.price_catalog import get_price_catalog
        from .agent_to_validator import AgentToValidator

        self.prompt_manager = get_prompt_manager()
        self.price_catalog = get_price_catalog()
        self.agent_to_validator = AgentToValidator()
        self.current_manifest: Optional[Dict[str, Any]] = None
        self.scenario_type: Optional[str] = (
            config.get('scenario_type') if config else None
        )
        self.scenario_parameters: Dict[str, Any] = (
            config.get('scenario_parameters', {}) if config else {}
        )

    async def process_message(self, message: AgentMessage) -> AgentMessage:
        """Process an incoming message and generate a response."""
        self.conversation_context['last_message'] = message.content
        self.conversation_context['last_sender'] = message.sender

        response_content = await self._generate_response(message)
        return AgentMessage(
            sender='recipient_agent',
            recipient=message.sender,
            content=response_content,
            validation_context=message.validation_context,
        )

    async def _generate_response(self, message: AgentMessage) -> str:
        """Generate a response to a message."""
        raise NotImplementedError

    async def get_thinking(self) -> AgentThinking:
        """Get the current thinking/reasoning state of the agent."""
        return AgentThinking(
            agent_id=self.agent_id,
            reasoning=self.current_thinking,
            confidence=0.85,
            next_actions=[],
        )

    def get_mode(self) -> AgentMode:
        """Get the agent's operation mode."""
        return AgentMode.SIMULATED

    async def handle_encryption_request(
        self,
        nonce: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Handle request to encrypt a nonce."""
        if not self.current_manifest:
            return {
                'success': False,
                'error': 'No manifest available for encryption',
            }

        if nonce is None:
            nonce = self.agent_to_validator.generate_nonce()

        public_key = self.agent_to_validator.extract_public_key(
            self.current_manifest,
        )
        if not public_key:
            return {
                'success': False,
                'error': 'Failed to extract public key from manifest',
            }

        encrypted = self.agent_to_validator.encrypt_nonce(nonce, public_key)

        if not encrypted:
            return {
                'success': False,
                'error': 'Failed to encrypt nonce',
            }

        return {
            'success': True,
            'nonce': nonce,
            'encrypted_nonce': encrypted,
            'nonce_hash': self.agent_to_validator.hash_nonce(nonce),
        }

    def set_manifest(self, manifest: Dict[str, Any]):
        """Set the current manifest for validation."""
        self.current_manifest = manifest


class ProcurementAgentInterface(AgentInterface):
    """Interface for the procurement agent (Agent Buyer)."""

    @abstractmethod
    async def handle_procurement_request(
        self, request: ProcurementRequest
    ) -> ProcurementDecision:
        """Handle a procurement request and make a decision."""
        pass

    @abstractmethod
    async def validate_manifest(
        self, manifest_data: Dict[str, Any]
    ) -> ValidationContext:
        """Validate a vendor manifest."""
        pass

    @abstractmethod
    async def validate_policy(
        self, policy_data: Dict[str, Any]
    ) -> ValidationContext:
        """Validate a policy document."""
        pass

    @abstractmethod
    async def negotiate(
        self, offer: Dict[str, Any], constraints: List[str]
    ) -> Dict[str, Any]:
        """Negotiate terms with a vendor."""
        pass


class RecipientAgentInterface(AgentInterface):
    """Interface for recipient agents (Type B clients)."""

    @abstractmethod
    async def handle_negotiation_offer(
        self, offer: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle a negotiation offer from the procurement agent."""
        pass

    @abstractmethod
    async def generate_quote(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a quote based on requirements."""
        pass

    @abstractmethod
    async def check_compliance(self, requirements: Dict[str, Any]) -> bool:
        """Check if requirements can be met compliantly."""
        pass


class AgentFactory:
    """Factory for creating agent instances."""

    @staticmethod
    def create_procurement_agent(
        mode: AgentMode, config: Optional[Dict[str, Any]] = None
    ) -> ProcurementAgentInterface:
        """Create a procurement agent based on mode."""
        _debug(f"AgentFactory.create_procurement_agent called with mode: {mode}")
        _debug(f"DEBUG: config = {config}")
        
        # Ensure MCP config is included
        if config is None:
            config = {}
        if 'mcp_server_url' not in config:
            from ..settings import settings
            config['mcp_server_url'] = settings.mcp_server_url
        
        if mode == AgentMode.LLM:
            from .procurement_agent import LLMProcurementAgent
            _debug("Creating LLMProcurementAgent")
            return LLMProcurementAgent(config=config)
        else:
            from .procurement_agent import SimulatedProcurementAgent
            _debug("Creating SimulatedProcurementAgent")
            return SimulatedProcurementAgent(config=config)

    @staticmethod
    def create_recipient_agent(
        mode: AgentMode, config: Optional[Dict[str, Any]] = None
    ) -> RecipientAgentInterface:
        """Create a recipient agent based on mode."""
        _debug(f"AgentFactory.create_recipient_agent called with mode: {mode}")
        _debug(f"DEBUG: config = {config}")
        
        # Ensure MCP config is included
        if config is None:
            config = {}
        if 'mcp_server_url' not in config:
            from ..settings import settings
            config['mcp_server_url'] = settings.mcp_server_url
        
        if mode == AgentMode.LLM:
            from .recipient_agent import LLMRecipientAgent
            _debug("Creating LLMRecipientAgent")
            return LLMRecipientAgent(config=config)
        else:
            from .recipient_agent import SimulatedRecipientAgent
            _debug("Creating SimulatedRecipientAgent")
            return SimulatedRecipientAgent(config=config)
