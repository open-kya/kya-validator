"""Procurement agent implementations (LLM and Simulated modes)."""
import asyncio
import random
from typing import Dict, Any, Optional, List
from datetime import datetime

from loguru import logger

from .agent_interfaces import BaseAgent, BaseProcurementAgent, ProcurementAgentInterface
from .agent_to_validator import AgentToValidator
from ..comms.schemas import (
    AgentMessage,
    AgentThinking,
    ProcurementRequest,
    ProcurementDecision,
    ValidationContext,
    ValidationStatus,
    AgentMode,
    MessageType,
)
from ..prompts import get_prompt_manager
from ..prompts.price_catalog import get_price_catalog


class SimulatedProcurementAgent(BaseProcurementAgent):
    """
    Simulated procurement agent using deterministic, pseudo-random logic.
    Useful for demos without requiring LLM API keys.
    """

    # Fallback template responses for different stages (used if YAML files unavailable)
    RESPONSE_TEMPLATES = {
        'greeting': [
            "Hello! I'm looking for cloud infrastructure services.",
            "Hi, I need to procure AI model inference capabilities.",
            "Good day. I'm interested in data pipeline solutions.",
            "Greetings! We're exploring options for ML workloads.",
            "Hi there! Our team needs scalable compute resources.",
            "Hello! I represent an organization seeking AI infrastructure.",
            "Good morning! We're evaluating cloud providers for our projects.",
            "Hi! Looking for enterprise-grade GPU services.",
        ],
        'inquiry': [
            "Can you tell me about your available GPU instances?",
            "What SLA guarantees do you offer for inference services?",
            "I need to understand your compliance certifications.",
            "What GPU models do you currently have in stock?",
            "How do you handle burst workloads and auto-scaling?",
            "What's your pricing model for reserved instances?",
            "Can you provide details on your network architecture?",
            "What monitoring and observability tools are included?",
            "How do you ensure data security and privacy?",
            "What's your typical provisioning time for new instances?",
        ],
        'negotiation': [
            "The pricing seems a bit high. Can we work on a better rate?",
            "I need a higher availability guarantee for this workload.",
            "Can you include additional support in this package?",
            "We're looking for volume discounts for long-term contracts.",
            "Can you improve the terms for our enterprise agreement?",
            "We need more flexible billing options for our usage patterns.",
            "What incentives can you offer for multi-year commitments?",
            "Can we negotiate better SLA penalties for downtime?",
            "We need custom terms for our compliance requirements.",
            "What's your best offer for our projected usage?",
        ],
        'validation_check': [
            "I need to validate your manifest against our policies.",
            "Let me check the compliance requirements for this service.",
            "I'm verifying the TEE and blockchain evidence now.",
            "Checking the MCP attestation certificates...",
            "Reviewing the manifest schema compliance...",
            "Validating the cryptographic evidence provided...",
            "I need to cross-reference your policy requirements.",
            "Let me verify the integrity of the evidence chain.",
            "Checking if your services meet our security standards.",
            "I'm reviewing the audit trails and logs.",
        ],
        'decision': [
            "Based on the validation results, I'm ready to proceed.",
            "The manifest validation failed. We need to address these issues.",
            "I need more information before making a decision.",
            "All validations passed! I'm authorizing the procurement.",
            "Some issues were found but they're not blocking.",
            "The evidence is insufficient. Please provide more details.",
            "Great! Everything checks out. Let's move forward.",
            "I have concerns about the compliance status.",
            "The validation was successful. Preparing the contract.",
            "I need additional approvals before finalizing.",
        ],
    }

    def _get_prompt(self, stage: str, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Get a prompt for the given stage, using PromptManager if available.

        Args:
            stage: The stage name (e.g., 'greeting', 'inquiry')
            context: Optional context for template rendering

        Returns:
            Prompt string or None if not available
        """
        context = context or {}
        return self.prompt_manager.load_prompt('procurement_agent', stage, context)

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
    ):
        """Initialize simulated procurement agent."""
        super().__init__(config)
        # Use scenario_id as seed for deterministic behavior
        scenario_id = self.config.get('scenario_id', 'default')
        self.random = random.Random(hash(scenario_id))
        self.stage = 'greeting'
        self.turn_count = 0

    async def _generate_response(self, message: AgentMessage) -> str:
        """Generate a response based on current stage."""
        self.turn_count += 1

        # Simulate thinking process
        await self._simulate_thinking()

        # Progress through stages
        if self.turn_count == 1:
            self.stage = 'greeting'
        elif self.turn_count == 2:
            self.stage = 'inquiry'
        elif self.turn_count <= 4:
            self.stage = 'negotiation'
        elif self.turn_count <= 6:
            self.stage = 'validation_check'
        else:
            self.stage = 'decision'

        # Try to get prompt from PromptManager first
        # Get pricing information from catalog for context
        service_pricing = self.price_catalog.get_service_pricing('compute_gpu')
        base_price = service_pricing['base_price'] if service_pricing else 2.50
        currency = service_pricing['currency'] if service_pricing else 'USD'
        tier_discount = service_pricing['discount'] if service_pricing else 0.0
        final_price = service_pricing['final_price'] if service_pricing else base_price

        context = {
            'service_type': 'cloud infrastructure',
            'resource_type': 'GPU',
            'base_price': base_price,
            'tier_discount': tier_discount,
            'final_price': final_price,
            'currency': currency,
        }
        prompt = self._get_prompt(self.stage, context)

        if prompt:
            response = prompt
        else:
            # Fall back to hardcoded templates
            templates = self.RESPONSE_TEMPLATES.get(
                self.stage, self.RESPONSE_TEMPLATES['greeting']
            )
            response = self.random.choice(templates)

        self.current_thinking = (
            f"Analyzing message from {message.sender}. "
            f"Current stage: {self.stage}. "
            f"Using {'PromptManager' if prompt else 'fallback templates'}."
        )
        self.thinking_history.append(self.current_thinking)

        # Capture debug metadata
        self._last_prompt = prompt if prompt else f"FALLBACK_TEMPLATE:{self.stage}"
        self._last_input_context = {
            'conversation_context': self.conversation_context.copy(),
            'incoming_message': {
                'content': message.content,
                'sender': message.sender,
            },
            'agent_state': {
                'stage': self.stage,
                'turn_count': self.turn_count,
                'scenario_type': getattr(self, 'scenario_type', None),
                'scenario_parameters': getattr(self, 'scenario_parameters', {}),
            },
            'pricing_context': context,
            'response_source': 'PromptManager' if prompt else 'fallback_templates',
        }

        return response

    async def _simulate_thinking(self):
        """Simulate the agent thinking process."""
        self.current_thinking = "Processing request and evaluating options..."
        await self.__class__.__dict__['_async_sleep'](0.5)  # Simulate processing time

    @staticmethod
    async def _async_sleep(seconds: float):
        """Helper for async sleep."""
        import asyncio
        await asyncio.sleep(seconds)

    async def handle_procurement_request(
        self, request: ProcurementRequest
    ) -> ProcurementDecision:
        """Handle a procurement request and make a decision."""
        # Simulate decision making
        await self._simulate_thinking()

        self.current_thinking = (
            f"Evaluating procurement request: {request.requirements}. "
            f"Checking constraints: {request.constraints}. "
            f"Budget: {request.budget}."
        )

        # Simple decision logic based on budget
        if request.budget and request.budget > 1000:
            decision = 'approve'
            reasoning = "Budget is sufficient and requirements are met."
            confidence = 0.9
        elif request.budget and request.budget > 500:
            decision = 'negotiate'
            reasoning = "Budget is borderline. Negotiation may be needed."
            confidence = 0.7
        else:
            decision = 'reject'
            reasoning = "Budget is too low for the requested requirements."
            confidence = 0.95

        return ProcurementDecision(
            decision=decision,
            vendor='demo_vendor',
            terms={'price': request.budget or 0, 'duration': '12 months'},
            reasoning=reasoning,
            validation_artifacts={},
            confidence=confidence,
        )

    async def validate_manifest(
        self, manifest_data: Dict[str, Any]
    ) -> ValidationContext:
        """Validate a vendor manifest."""
        await self._simulate_thinking()

        # Simulate validation
        is_valid = self.random.random() > 0.2  # 80% success rate

        if is_valid:
            return ValidationContext(
                manifest_id=manifest_data.get('id', 'unknown'),
                validation_status=ValidationStatus.VALID,
                mcp_validated=True,
                tee_validated=True,
                blockchain_validated=True,
            )
        else:
            return ValidationContext(
                manifest_id=manifest_data.get('id', 'unknown'),
                validation_status=ValidationStatus.INVALID,
                validation_errors=[
                    {
                        'code': 'MANIFEST_SCHEMA_ERROR',
                        'message': 'Manifest does not conform to schema',
                        'severity': 'error',
                    }
                ],
                mcp_validated=False,
                tee_validated=False,
                blockchain_validated=False,
            )

    async def validate_policy(
        self, policy_data: Dict[str, Any]
    ) -> ValidationContext:
        """Validate a policy document."""
        await self._simulate_thinking()

        # Simulate validation
        is_valid = self.random.random() > 0.15  # 85% success rate

        if is_valid:
            return ValidationContext(
                policy_id=policy_data.get('id', 'unknown'),
                validation_status=ValidationStatus.VALID,
            )
        else:
            return ValidationContext(
                policy_id=policy_data.get('id', 'unknown'),
                validation_status=ValidationStatus.INVALID,
                validation_errors=[
                    {
                        'code': 'POLICY_COMPLIANCE_ERROR',
                        'message': 'Policy does not meet compliance requirements',
                        'severity': 'error',
                    }
                ],
            )

    async def negotiate(
        self, offer: Dict[str, Any], constraints: List[str]
    ) -> Dict[str, Any]:
        """Negotiate terms with a vendor."""
        await self._simulate_thinking()

        self.current_thinking = (
            f"Negotiating offer: {offer}. "
            f"Constraints to consider: {constraints}."
        )

        # Get service and tier from offer
        service_name = offer.get('service', 'compute_gpu')
        tier = offer.get('tier', 'on-demand')

        # Get pricing from catalog
        service_pricing = self.price_catalog.get_service_pricing(service_name, tier)
        if service_pricing is None:
            service_pricing = self.price_catalog.get_service_pricing('compute_gpu', 'on-demand')

        base_price = service_pricing['base_price'] if service_pricing else 2.50
        discount = service_pricing['discount'] if service_pricing else 0.0
        catalog_price = service_pricing['final_price'] if service_pricing else base_price

        # Get scenario parameters for desperate buyer scenario
        urgency = self.scenario_parameters.get('urgency_level', 'low')
        price_sensitivity = self.scenario_parameters.get('price_sensitivity', 'strict')

        # Negotiation logic based on scenario
        price = offer.get('price', 0)

        if urgency == 'critical' or price_sensitivity == 'flexible':
            # Desperate buyer - accept higher prices
            return {
                'response_type': 'accept',
                'reasoning': (
                    'Given the urgency and our flexible pricing requirements, '
                    'we accept the offer terms.'
                ),
            }
        elif price > catalog_price * 1.2:
            # Offer is more than 20% above catalog price
            counter_price = catalog_price * 1.05  # Counter with 5% above catalog
            return {
                'response_type': 'counter',
                'counter_terms': {
                    'price': counter_price,
                    'tier': tier,
                    'base_price': base_price,
                    'discount': discount,
                },
                'reasoning': (
                    f'Price is above market rate. Based on catalog pricing, '
                    f'we can offer {counter_price} {service_pricing["currency"] if service_pricing else "USD"} '
                    f'(catalog: {catalog_price}, {discount*100:.0f}% discount from base {base_price}).'
                ),
            }
        else:
            return {
                'response_type': 'accept',
                'reasoning': 'Offer terms are acceptable and align with market pricing.',
            }


class LLMProcurementAgent(BaseAgent, ProcurementAgentInterface):
    """
    Real LLM-based procurement agent using LangChain/LangGraph.
    Requires API keys to be configured.
    """

    # Template responses for fallback to simulated mode
    RESPONSE_TEMPLATES = {
        'greeting': [
            "Hello! I'm looking for cloud infrastructure services.",
            "Hi, I need to procure AI model inference capabilities.",
            "Good day. I'm interested in data pipeline solutions.",
            "Greetings! We're exploring options for ML workloads.",
            "Hi there! Our team needs scalable compute resources.",
            "Hello! I represent an organization seeking AI infrastructure.",
            "Good morning! We're evaluating cloud providers for our projects.",
            "Hi! Looking for enterprise-grade GPU services.",
        ],
        'inquiry': [
            "Can you tell me about your available GPU instances?",
            "What SLA guarantees do you offer for inference services?",
            "I need to understand your compliance certifications.",
            "What GPU models do you currently have in stock?",
            "How do you handle burst workloads and auto-scaling?",
            "What's your pricing model for reserved instances?",
            "Can you provide details on your network architecture?",
            "What monitoring and observability tools are included?",
            "How do you ensure data security and privacy?",
            "What's your typical provisioning time for new instances?",
        ],
        'negotiation': [
            "The pricing seems a bit high. Can we work on a better rate?",
            "I need a higher availability guarantee for this workload.",
            "Can you include additional support in this package?",
            "We're looking for volume discounts for long-term contracts.",
            "Can you improve terms for our enterprise agreement?",
            "We need more flexible billing options for our usage patterns.",
            "What incentives can you offer for multi-year commitments?",
            "Can we negotiate better SLA penalties for downtime?",
            "We need custom terms for our compliance requirements.",
            "What's your best offer for our projected usage?",
        ],
        'validation_check': [
            "I need to validate your manifest against our policies.",
            "Let me check the compliance requirements for this service.",
            "I'm verifying the TEE and blockchain evidence now.",
            "Checking MCP attestation certificates...",
            "Reviewing the manifest schema compliance...",
            "Validating the cryptographic evidence provided...",
            "I need to cross-reference your policy requirements.",
            "Let me verify the integrity of the evidence chain.",
            "Checking if your services meet our security standards.",
            "I'm reviewing the audit trails and logs.",
        ],
        'decision': [
            "Based on the validation results, I'm ready to proceed.",
            "The manifest validation failed. We need to address these issues.",
            "I need more information before making a decision.",
            "All validations passed! I'm authorizing the procurement.",
            "Some issues were found but they're not blocking.",
            "The evidence is insufficient. Please provide more details.",
            "Great! Everything checks out. Let's move forward.",
            "I have concerns about the compliance status.",
            "The validation was successful. Preparing the contract.",
            "I need additional approvals before finalizing.",
        ],
    }

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
    ):
        """Initialize LLM procurement agent."""
        # Call parent BaseAgent.__init__ which handles MCP initialization
        BaseAgent.__init__(self, 'procurement-llm', config)
        
        # Rest of existing initialization...
        self.llm = None
        self.mode = AgentMode.SIMULATED  # Initialize with default mode
        self.turn_count = 0  # Initialize for fallback to simulated mode
        self.stage = 'greeting'  # Initialize stage for fallback
        self.validation_context = None
        self.negotiation_state = {}
        self.conversation_context: Dict[str, Any] = {}  # Initialize conversation context
        self.current_thinking = ''  # Initialize current thinking
        self.thinking_history: List[str] = []  # Initialize thinking history
        self.prompt_manager = get_prompt_manager()
        self.price_catalog = get_price_catalog()
        self.agent_to_validator = AgentToValidator()
        # Initialize for fallback
        self.random = random.Random(
            hash(self.config.get('scenario_id', 'default')),
        )
        self._initialize_llm()

    def _initialize_llm(self):
        """Initialize the LLM based on configuration."""
        try:
            from langchain_openai import ChatOpenAI
            from ..settings import settings
            from ..llm import create_glm_client

            provider = self.config.get('llm_provider', settings.default_llm_provider)
            model = self.config.get('model', settings.default_model)

            logger.debug(f"Initializing LLMProcurementAgent with provider={provider}, model={model}")

            if provider == 'glm':
                # Use GLM/Z.ai client
                api_key = self.config.get('glm_api_key') or settings.glm_api_key
                api_url = self.config.get('glm_api_url') or settings.glm_api_url
                glm_model = self.config.get('glm_model') or settings.glm_model

                self.glm_client = create_glm_client(
                    api_key=api_key,
                    api_url=api_url,
                    model=glm_model,
                    temperature=0.7,
                )
                if self.glm_client:
                    self.mode = AgentMode.LLM
                    logger.debug("GLM client initialized successfully")
                else:
                    self.mode = AgentMode.SIMULATED
                    logger.warning("GLM client initialization failed - using SIMULATED mode")
            elif provider == 'openai':
                api_key = self.config.get('openai_api_key') or settings.openai_api_key
                if api_key:
                    self.llm = ChatOpenAI(
                        model=model,
                        api_key=api_key,
                        temperature=0.7,
                    )
                    self.mode = AgentMode.LLM
                    logger.debug("OpenAI client initialized successfully")
                else:
                    logger.warning("No OpenAI API key provided - using SIMULATED mode")
            else:
                logger.warning(f"Unknown provider: {provider} - using SIMULATED mode")
        except ImportError as e:
            logger.warning(f'LangChain not available. Using simulated mode. Error: {e}')
            self.mode = AgentMode.SIMULATED
        except Exception as e:
            logger.error(f"LLM initialization failed: {e}")
            self.mode = AgentMode.SIMULATED

    async def _generate_response(self, message: AgentMessage) -> str:
        """Generate a response using the LLM."""
        # Check if GLM client is available
        if hasattr(self, 'glm_client') and self.glm_client is not None:
            try:
                prompt = self._build_prompt(message)
                await asyncio.sleep(1)
                response = await self.glm_client.generate_response(prompt)
                self.current_thinking = f"GLM generated response for {message.sender}"
                
                # Capture debug metadata for LLM responses
                self._last_prompt = prompt
                self._last_input_context = {
                    'conversation_context': self.conversation_context.copy(),
                    'incoming_message': {
                        'content': message.content,
                        'sender': message.sender,
                    },
                    'agent_state': {
                        'stage': getattr(self, 'stage', 'unknown'),
                        'turn_count': getattr(self, 'turn_count', 0),
                        'scenario_type': getattr(self, 'scenario_type', None),
                        'scenario_parameters': getattr(self, 'scenario_parameters', {}),
                    },
                    'llm_provider': 'glm',
                    'response_source': 'GLM_LLM',
                }
                
                return response
            except Exception as e:
                logger.error(f"GLM error: {e}. Using simulated response.")
                return await self._fallback_simulated_response(message)

        # Check if LangChain LLM is available
        if hasattr(self, 'llm') and self.llm is not None:
            try:
                prompt = self._build_prompt(message)
                response = await self.llm.ainvoke(prompt)
                self.current_thinking = f"LLM generated response for {message.sender}"
                
                # Capture debug metadata for LLM responses
                self._last_prompt = prompt
                self._last_input_context = {
                    'conversation_context': self.conversation_context.copy(),
                    'incoming_message': {
                        'content': message.content,
                        'sender': message.sender,
                    },
                    'agent_state': {
                        'stage': getattr(self, 'stage', 'unknown'),
                        'turn_count': getattr(self, 'turn_count', 0),
                        'scenario_type': getattr(self, 'scenario_type', None),
                        'scenario_parameters': getattr(self, 'scenario_parameters', {}),
                    },
                    'llm_provider': 'openai',
                    'response_source': 'OpenAI_LLM',
                }
                
                return response.content
            except Exception as e:
                logger.error(f"LLM error: {e}. Using simulated response.")
                return await self._fallback_simulated_response(message)

        # Fall back to simulated behavior
        logger.warning("No LLM client available - using simulated response")
        return await self._fallback_simulated_response(message)

    async def _fallback_simulated_response(self, message: AgentMessage) -> str:
        """Generate a simulated response when LLM is not available."""
        # Simulate thinking first
        import asyncio
        self.current_thinking = "Processing request and evaluating options..."
        await asyncio.sleep(0.5)
        # Progress through stages
        self.turn_count += 1
        if self.turn_count == 1:
            self.stage = 'greeting'
        elif self.turn_count == 2:
            self.stage = 'inquiry'
        elif self.turn_count <= 4:
            self.stage = 'negotiation'
        elif self.turn_count <= 6:
            self.stage = 'validation_check'
        else:
            self.stage = 'decision'
        # Select a random template response
        templates = self.RESPONSE_TEMPLATES.get(self.stage, self.RESPONSE_TEMPLATES['greeting'])
        response = self.random.choice(templates)
        self.current_thinking = f"Analyzing message from {message.sender}. Current stage: {self.stage}."
        self.thinking_history.append(self.current_thinking)
        return response

    def _build_prompt(self, message: AgentMessage) -> str:
        """Build a prompt for the LLM."""
        # Try to get system prompt from PromptManager
        system_prompt = self.prompt_manager.get_system_prompt('procurement_agent')

        if system_prompt:
            prompt = f"""{system_prompt}

Current conversation context: {self.conversation_context}

Message from {message.sender}: {message.content}

Provide a professional, concise response as the procurement agent."""
        else:
            # Fall back to hardcoded prompt
            prompt = f"""You are a procurement agent for cloud infrastructure and AI services.
Your role is to:
1. Understand vendor offerings
2. Validate manifests and policies
3. Negotiate favorable terms
4. Ensure compliance with organizational policies

Current conversation context: {self.conversation_context}

Message from {message.sender}: {message.content}

Provide a professional, concise response as the procurement agent."""

        return prompt

    async def handle_procurement_request(
        self, request: ProcurementRequest
    ) -> ProcurementDecision:
        """Handle a procurement request using LLM."""
        if self.llm is None:
            return await SimulatedProcurementAgent.handle_procurement_request(
                self, request
            )

        prompt = f"""
Analyze this procurement request and make a decision:

Requirements: {request.requirements}
Constraints: {request.constraints}
Budget: {request.budget}
Deadline: {request.deadline}

Provide your decision as 'approve', 'reject', or 'negotiate',
along with reasoning and confidence (0-1).
"""

        try:
            response = await self.llm.ainvoke(prompt)
            # Parse response (simplified - in production would use structured output)
            return ProcurementDecision(
                decision='approve',  # Simplified
                vendor='llm_vendor',
                terms={},
                reasoning=response.content,
                validation_artifacts={},
                confidence=0.8,
            )
        except Exception as e:
            return await SimulatedProcurementAgent.handle_procurement_request(
                self, request
            )

    async def _execute_direct_api(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute tool via direct API call when MCP is not available."""
        logger.info(f"Executing '{tool_name}' via direct API")
        
        # Handle different tools
        if tool_name == 'validate_manifest':
            return await self._direct_validate_manifest(arguments)
        elif tool_name == 'validate_policy':
            return await self._direct_validate_policy(arguments)
        elif tool_name == 'get_pricing':
            return self._direct_get_pricing(arguments)
        elif tool_name == 'encrypt_nonce':
            return self._direct_encrypt_nonce(arguments)
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
    
    async def _direct_validate_manifest(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Direct API call for manifest validation."""
        from ..validation.manifest_validator import ManifestValidator
        
        manifest_data = arguments.get('manifest_data', {})
        validator = ManifestValidator()
        
        try:
            result = validator.validate(manifest_data)
            return {
                'valid': result.get('valid', False),
                'errors': result.get('errors', []),
                'warnings': result.get('warnings', []),
            }
        except Exception as e:
            logger.error(f"Direct manifest validation failed: {e}")
            return {
                'valid': False,
                'errors': [str(e)],
            }
    
    async def _direct_validate_policy(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Direct API call for policy validation."""
        policy_data = arguments.get('policy_data', {})
        
        # Simulated policy validation (can be enhanced with actual validator)
        return {
            'valid': True,
            'errors': [],
            'warnings': [],
        }
    
    def _direct_get_pricing(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Direct API call for pricing information."""
        service = arguments.get('service', 'default')
        
        # Use pricing catalog
        from ..prompts.price_catalog import PriceCatalog
        catalog = PriceCatalog()
        pricing = catalog.get_service_pricing(service)
        
        return {
            'price': pricing.get('price', 2.50),
            'currency': pricing.get('currency', 'USD'),
            'service': service,
        }
    
    def _direct_encrypt_nonce(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Direct API call for nonce encryption."""
        nonce = arguments.get('nonce')
        key = arguments.get('key')
        
        if not nonce or not key:
            raise ValueError("nonce and key are required")
        
        encrypted = self.agent_to_validator.encrypt_nonce(nonce, key)
        return {
            'encrypted_nonce': encrypted,
        }

    async def process_message(self, message: AgentMessage) -> AgentMessage:
        """Process an incoming message and generate a response."""
        self.conversation_context['last_message'] = message.content
        self.conversation_context['last_sender'] = message.sender

        response_content = await self._generate_response(message)
        return AgentMessage(
            sender='procurement_agent',
            recipient=message.sender,
            content=response_content,
            validation_context=message.validation_context,
        )

    async def get_thinking(self) -> AgentThinking:
        """Get the current thinking/reasoning state of the agent."""
        return AgentThinking(
            agent_id=self.agent_id,
            reasoning=self.current_thinking,
            confidence=0.85,
            next_actions=[],
        )

    async def validate_manifest(
        self, manifest_data: Dict[str, Any]
    ) -> ValidationContext:
        """Validate manifest using MCP if available, otherwise direct API."""
        try:
            # Use MCP if available
            if self.is_mcp_available():
                result = asyncio.run(self.execute_with_mcp(
                    'validate_manifest',
                    {'manifest_data': manifest_data}
                ))
            else:
                result = asyncio.run(self._execute_direct_api(
                    'validate_manifest',
                    {'manifest_data': manifest_data}
                ))
            
            return ValidationContext(
                manifest_id=manifest_data.get('@id', 'unknown'),
                policy_id=manifest_data.get('policyId', 'unknown'),
                validation_status=ValidationStatus.VALID if result.get('valid') else ValidationStatus.INVALID,
                mcp_validated=self.is_mcp_available(),
                tee_validated=False,
                blockchain_validated=False,
                errors=result.get('errors', []),
            )
        except Exception as e:
            logger.error(f"Manifest validation failed: {e}")
            return ValidationContext(
                manifest_id=manifest_data.get('@id', 'unknown'),
                policy_id=manifest_data.get('policyId', 'unknown'),
                validation_status=ValidationStatus.ERROR,
                mcp_validated=False,
                tee_validated=False,
                blockchain_validated=False,
                errors=[str(e)],
            )

    async def validate_policy(
        self, policy_data: Dict[str, Any]
    ) -> ValidationContext:
        """Validate policy using LLM for analysis."""
        # In production, this would integrate with KYA Validator
        return await SimulatedProcurementAgent.validate_policy(self, policy_data)

    async def negotiate(
        self, offer: Dict[str, Any], constraints: List[str]
    ) -> Dict[str, Any]:
        """Negotiate using MCP if available, otherwise direct API."""
        try:
            # Use MCP if available
            if self.is_mcp_available():
                result = asyncio.run(self.execute_with_mcp(
                    'negotiate',
                    {'offer': offer, 'constraints': constraints}
                ))
            else:
                # Use pricing catalog directly
                from ..prompts.price_catalog import PriceCatalog
                catalog = PriceCatalog()
                result = catalog.get_service_pricing(offer.get('service', 'default'))
            
            return {
                'counter_offer': result,
                'mcp_used': self.is_mcp_available(),
            }
        except Exception as e:
            logger.error(f"Negotiation failed: {e}")
            return {
                'counter_offer': offer,
                'mcp_used': False,
                'error': str(e),
            }

    def get_mode(self) -> AgentMode:
        """Get the agent's operation mode."""
        has_llm = hasattr(self, 'llm') and self.llm is not None
        has_glm = hasattr(self, 'glm_client') and self.glm_client is not None
        return AgentMode.LLM if (has_llm or has_glm) else AgentMode.SIMULATED
