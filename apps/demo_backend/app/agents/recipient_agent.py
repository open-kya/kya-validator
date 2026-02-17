"""Recipient agent implementations (Type B clients)."""
import asyncio
import random
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from loguru import logger

from .agent_interfaces import BaseAgent, BaseRecipientAgent, RecipientAgentInterface
from .agent_to_validator import AgentToValidator
from ..comms.schemas import (
    AgentMessage,
    AgentThinking,
    ValidationContext,
    AgentMode,
)
from ..prompts import get_prompt_manager
from ..prompts.price_catalog import get_price_catalog
from ..llm.mcp_client import MCPClientWrapper


class SimulatedRecipientAgent(BaseRecipientAgent):
    """Simulated recipient agent using deterministic, pseudo-random logic."""

    # Fallback template responses for different stages
    RESPONSE_TEMPLATES = {
        'greeting': [
            'Welcome! I\'m here to help with your procurement needs.',
            'Hello! How can I assist you today?',
            'Good day! What services are you looking for?',
            'Greetings! Thank you for your interest in our services.',
            'Hi there! I\'d be happy to discuss your requirements.',
            'Welcome aboard! Let me know what you need.',
            'Hello! We\'re excited to work with you.',
            'Good morning! How can we help you today?',
        ],
        'product_info': [
            'We offer GPU instances ranging from A100 to H100.',
            'Our inference services support all major model frameworks.',
            'We provide managed data pipeline solutions with 99.9% SLA.',
            'Our GPU clusters are optimized for ML training workloads.',
            'We have real-time inference endpoints with sub-10ms latency.',
            'Our storage solutions are NVMe-based for max performance.',
            'We offer spot instances for cost-effective batch processing.',
            'Our managed Kubernetes service comes with GPU support.',
            'We provide custom model serving solutions.',
            'Our data pipeline service supports ETL, streaming, and batch.',
        ],
        'negotiation': [
            'I can offer a 5% discount for annual commitments.',
            'Let me check with our team about better pricing.',
            'We can include premium support at no extra cost.',
            'For enterprise customers, we can offer volume discounts.',
            'I can extend payment terms to 60 days.',
            'We\'re open to custom SLA agreements.',
            'I can waive setup fees for your first deployment.',
            'We offer tiered pricing based on usage.',
            'Let me see what flexibility we have on this quote.',
            'I can include a proof-of-concept period.',
        ],
        'compliance': [
            'We\'re SOC 2 Type II certified and GDPR compliant.',
            'Our infrastructure is ISO 27001 certified.',
            'We maintain full audit trails for all transactions.',
            'We\'re HIPAA compliant for healthcare workloads.',
            'Our data centers meet PCI DSS Level 1 requirements.',
            'We have FedRAMP authorization for government workloads.',
            'We\'re compliant with CCPA and other privacy regulations.',
            'Our TEE implementation is FIPS 140-2 validated.',
            'We maintain SOC 1 Type II reports for financial auditing.',
            'Our blockchain evidence is anchored to public chains.',
        ],
        'closing': [
            'Great! I\'ll prepare the contract for your review.',
            'Excellent! Let\'s move forward with the agreement.',
            'Perfect! I\'ll send over the final documents.',
            'Wonderful! I\'ll initiate the onboarding process.',
            'Fantastic! Let me get the paperwork started.',
            'Brilliant! I\'ll prepare the service agreement.',
            'Awesome! I\'ll send the contract for signature.',
            'Superb! I\'ll finalize the documentation.',
        ],
    }

    def _get_prompt(
        self,
        stage: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Get a prompt for the given stage, using PromptManager if available.

        Args:
            stage: The stage name (e.g., 'greeting', 'product_info')
            context: Optional context for template rendering

        Returns:
            Prompt string or None if not available
        """
        context = context or {}
        return self.prompt_manager.load_prompt('recipient_agent', stage, context)

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize simulated recipient agent."""
        super().__init__(config)
        scenario_id = self.config.get('scenario_id', 'default')
        # Different seed for deterministic behavior
        self.random = random.Random(hash(scenario_id) + 1)
        self.stage = 'greeting'
        self.turn_count = 0

    async def _generate_response(self, message: AgentMessage) -> str:
        """Generate a response based on current stage."""
        self.turn_count += 1

        await self._simulate_thinking()

        # Progress through stages
        if self.turn_count == 1:
            self.stage = 'greeting'
        elif self.turn_count <= 3:
            self.stage = 'product_info'
        elif self.turn_count <= 5:
            self.stage = 'negotiation'
        elif self.turn_count <= 7:
            self.stage = 'compliance'
        else:
            self.stage = 'closing'

        # Try to get prompt from PromptManager first
        # Get pricing information from catalog
        service_pricing = self.price_catalog.get_service_pricing('compute_gpu')
        base_price = service_pricing['base_price'] if service_pricing else 2.50
        currency = service_pricing['currency'] if service_pricing else 'USD'
        tier_discount = service_pricing['discount'] if service_pricing else 0.0
        final_price = service_pricing['final_price'] if service_pricing else base_price

        context = {
            'product_type': 'GPU instances',
            'min_model': 'A100',
            'max_model': 'H100',
            'service_type': 'inference',
            'sla': '99.9%',
            'certification': 'SOC 2 Type II',
            'regulation': 'GDPR',
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
            f'Responding to {message.sender}. '
            f'Current stage: {self.stage}. '
            f'Using {"PromptManager" if prompt else "fallback templates"}.'
        )

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
        import asyncio
        self.current_thinking = 'Processing request...'
        await asyncio.sleep(0.3)

    async def handle_negotiation_offer(
        self,
        offer: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle a negotiation offer from the procurement agent."""
        await self._simulate_thinking()

        # Get tier from offer or default to on-demand
        tier = offer.get('tier', 'on-demand')
        service_name = offer.get('service', 'compute_gpu')

        # Get pricing from catalog
        service_pricing = self.price_catalog.get_service_pricing(
            service_name, tier,
        )
        if service_pricing is None:
            service_pricing = self.price_catalog.get_service_pricing(
                'compute_gpu', 'on-demand'
            )

        base_price = service_pricing['base_price'] if service_pricing else 2.50
        discount = service_pricing['discount'] if service_pricing else 0.0
        final_price = service_pricing['final_price'] if service_pricing else base_price

        price = offer.get('price', 0)
        # Compare offer price with catalog price
        if price > final_price * 1.1:  # Offer is more than 10% above catalog price
            return {
                'response_type': 'counter',
                'counter_terms': {
                    'price': final_price,
                    'tier': tier,
                    'base_price': base_price,
                    'discount': discount,
                },
                'reasoning': (
                    f'Based on our {tier} tier pricing, we can offer '
                    f'{final_price} '
                    f'{service_pricing["currency"] if service_pricing else "USD"} '
                    f'(base: {base_price}, {discount*100:.0f}% discount).'
                ),
            }
        else:
            return {
                'response_type': 'accept',
                'reasoning': 'The offer meets our requirements.',
            }

    async def generate_quote(
        self,
        requirements: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate a quote based on requirements."""
        await self._simulate_thinking()

        # Determine service type from requirements
        service_name = 'compute_gpu'
        if 'inference' in str(requirements).lower():
            service_name = 'inference_services'
        elif 'storage' in str(requirements).lower():
            service_name = 'storage_solutions'
        elif 'pipeline' in str(requirements).lower():
            service_name = 'data_pipelines'

        # Get tier from requirements or default to on-demand
        tier = requirements.get('tier', 'on-demand')

        # Get pricing from catalog
        service_pricing = self.price_catalog.get_service_pricing(
            service_name, tier,
        )
        if service_pricing is None:
            service_pricing = self.price_catalog.get_service_pricing(
                'compute_gpu', 'on-demand'
            )

        # Calculate price for a typical quantity
        quantity = requirements.get('quantity', 100)  # Default 100 units
        price_calc = self.price_catalog.calculate_price(
            service_name, quantity, tier,
        )

        return {
            'service': service_name,
            'tier': tier,
            'base_price': service_pricing['base_price'] if service_pricing else 0,
            'discount': service_pricing['discount'] if service_pricing else 0,
            'final_price': price_calc['total_price'] if price_calc else 0,
            'quantity': quantity,
            'currency': service_pricing['currency'] if service_pricing else 'USD',
            'duration': '12 months',
            'sla': '99.9%',
            'support': '24/7',
        }

    async def check_compliance(
        self,
        requirements: Dict[str, Any],
    ) -> bool:
        """Check if requirements can be met compliantly."""
        await self._simulate_thinking()
        # Simulate compliance check - 90% pass rate
        return random.random() > 0.1


class LLMRecipientAgent(BaseAgent, RecipientAgentInterface):
    """Real LLM-based recipient agent using LangChain."""

    # Template responses for fallback to simulated mode
    RESPONSE_TEMPLATES = {
        'greeting': [
            'Welcome! I\'m here to help with your procurement needs.',
            'Hello! How can I assist you today?',
            'Good day! What services are you looking for?',
            'Greetings! Thank you for your interest in our services.',
            'Hi there! I\'d be happy to discuss your requirements.',
            'Welcome aboard! Let me know what you need.',
            'Hello! We\'re excited to work with you.',
            'Good morning! How can we help you today?',
        ],
        'product_info': [
            'We offer GPU instances ranging from A100 to H100.',
            'Our inference services support all major model frameworks.',
            'We provide managed data pipeline solutions with 99.9% SLA.',
            'Our GPU clusters are optimized for ML training workloads.',
            'We have real-time inference endpoints with sub-10ms latency.',
            'Our storage solutions are NVMe-based for max performance.',
            'We offer spot instances for cost-effective batch processing.',
            'Our managed Kubernetes service comes with GPU support.',
            'We provide custom model serving solutions.',
            'Our data pipeline service supports ETL, streaming, and batch.',
        ],
        'negotiation': [
            'I can offer a 5% discount for annual commitments.',
            'Let me check with our team about better pricing.',
            'We can include premium support at no extra cost.',
            'For enterprise customers, we can offer volume discounts.',
            'I can extend payment terms to 60 days.',
            'We\'re open to custom SLA agreements.',
            'I can waive setup fees for your first deployment.',
            'We offer tiered pricing based on usage.',
            'Let me see what flexibility we have on this quote.',
            'I can include a proof-of-concept period.',
        ],
        'compliance': [
            'We\'re SOC 2 Type II certified and GDPR compliant.',
            'Our infrastructure is ISO 27001 certified.',
            'We maintain full audit trails for all transactions.',
            'We\'re HIPAA compliant for healthcare workloads.',
            'Our data centers meet PCI DSS Level 1 requirements.',
            'We have FedRAMP authorization for government workloads.',
            'We\'re compliant with CCPA and other privacy regulations.',
            'Our TEE implementation is FIPS 140-2 validated.',
            'We maintain SOC 1 Type II reports for financial auditing.',
            'Our blockchain evidence is anchored to public chains.',
        ],
        'closing': [
            'Great! I\'ll prepare the contract for your review.',
            'Excellent! Let\'s move forward with the agreement.',
            'Perfect! I\'ll send over the final documents.',
            'Wonderful! I\'ll initiate the onboarding process.',
            'Fantastic! Let me get the paperwork started.',
            'Brilliant! I\'ll prepare the service agreement.',
            'Awesome! I\'ll send the contract for signature.',
            'Superb! I\'ll finalize the documentation.',
        ],
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize LLM recipient agent."""
        # Call parent BaseAgent.__init__ which handles MCP initialization
        BaseAgent.__init__(self, config)
        
        # Rest of existing initialization...
        self.agent_id = config.get('agent_id', 'recipient-llm') if config else 'recipient-llm'
        self.scenario_id = config.get('scenario_id', 'default') if config else 'default'
        self.mode = AgentMode.LLM
        self.conversation_context: Dict[str, Any] = {}  # Fixed: should be Dict, not list
        self.current_stage = 'greeting'
        self.validation_context = None
        self.negotiation_state = {}
        self.glm_client = None
        self.llm = None
        self.turn_count = 0  # Initialize for fallback to simulated mode
        self.current_thinking = ''
        self.thinking_history: List[str] = []
        self.prompt_manager = get_prompt_manager()
        self.agent_to_validator = AgentToValidator()
        self.price_catalog = get_price_catalog()
        self.current_manifest: Optional[Dict[str, Any]] = None
        self.scenario_type: Optional[str] = config.get('scenario_type') if config else None
        self.scenario_parameters: Dict[str, Any] = config.get('scenario_parameters', {}) if config else {}
        # Initialize for fallback
        self.random = random.Random(hash(self.scenario_id) + 1)
        
        # Initialize LLM
        self._initialize_llm()

    def _initialize_llm(self):
        """Initialize the LLM based on configuration."""
        try:
            from langchain_openai import ChatOpenAI
            from ..settings import settings
            from ..llm import create_glm_client

            provider = self.config.get(
                'llm_provider', settings.default_llm_provider,
            )
            model = self.config.get('model', settings.default_model)

            logger.debug(f"Initializing LLMRecipientAgent with provider={provider}, model={model}")

            if provider == 'glm':
                # Use GLM/Z.ai client
                api_key = (
                    self.config.get('glm_api_key') or settings.glm_api_key
                )
                api_url = (
                    self.config.get('glm_api_url') or settings.glm_api_url
                )
                glm_model = (
                    self.config.get('glm_model') or settings.glm_model
                )

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
                api_key = (
                    self.config.get('openai_api_key')
                    or settings.openai_api_key
                )
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

    async def _execute_direct_api(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute tool via direct API call when MCP is not available."""
        logger.info(f"Executing '{tool_name}' via direct API")
        
        # Handle different tools
        if tool_name == 'generate_quote':
            return self._direct_generate_quote(arguments)
        elif tool_name == 'check_compliance':
            return self._direct_check_compliance(arguments)
        elif tool_name == 'verify_nonce':
            return self._direct_verify_nonce(arguments)
        elif tool_name == 'encrypt_nonce':
            return self._direct_encrypt_nonce(arguments)
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
    
    def _direct_generate_quote(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Direct API call for quote generation."""
        requirements = arguments.get('requirements', {})
        service = requirements.get('service', 'default')
        
        # Use pricing catalog
        pricing = self.price_catalog.get_service_pricing(service)
        
        return {
            'price': pricing.get('price', 2.50),
            'currency': pricing.get('currency', 'USD'),
            'service': service,
            'valid_until': (datetime.utcnow() + timedelta(days=30)).isoformat(),
        }
    
    def _direct_check_compliance(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Direct API call for compliance checking."""
        requirements = arguments.get('requirements', {})
        
        # Simulated compliance check (90% pass rate)
        import random
        random.seed(self.scenario_id)
        is_compliant = random.random() < 0.9
        
        return {
            'compliant': is_compliant,
            'requirements': requirements,
            'issues': [] if is_compliant else ['Minor compliance issue detected'],
        }
    
    def _direct_verify_nonce(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Direct API call for nonce verification."""
        nonce = arguments.get('nonce')
        signature = arguments.get('signature')
        
        if not nonce or not signature:
            raise ValueError("nonce and signature are required")
        
        # Simulated verification
        verified = self.agent_to_validator.verify_nonce(nonce, signature)
        
        return {
            'verified': verified,
            'nonce': nonce,
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

    async def _generate_response(self, message: AgentMessage) -> str:
        """Generate a response using the LLM."""
        # Check if GLM client is available
        if hasattr(self, 'glm_client') and self.glm_client is not None:
            try:
                prompt = self._build_prompt(message)
                await asyncio.sleep(5)
                response = await self.glm_client.generate_response(prompt)
                self.current_thinking = (
                    f'GLM generated response for {message.sender}'
                )
                
                # Capture debug metadata for LLM responses
                self._last_prompt = prompt
                self._last_input_context = {
                    'conversation_context': self.conversation_context.copy(),
                    'incoming_message': {
                        'content': message.content,
                        'sender': message.sender,
                    },
                    'agent_state': {
                        'stage': getattr(self, 'current_stage', 'unknown'),
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
                self.current_thinking = (
                    f'LLM generated response for {message.sender}'
                )
                
                # Capture debug metadata for LLM responses
                self._last_prompt = prompt
                self._last_input_context = {
                    'conversation_context': self.conversation_context.copy(),
                    'incoming_message': {
                        'content': message.content,
                        'sender': message.sender,
                    },
                    'agent_state': {
                        'stage': getattr(self, 'current_stage', 'unknown'),
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

    def _build_prompt(self, message: AgentMessage) -> str:
        """Build a prompt for the LLM."""
        # Try to get system prompt from PromptManager
        system_prompt = self.prompt_manager.get_system_prompt(
            'recipient_agent',
        )

        if system_prompt:
            prompt = f"""{system_prompt}

Current conversation: {self.conversation_context}

Message from {message.sender}: {message.content}

Provide a professional, helpful response."""
        else:
            # Fall back to hardcoded prompt
            prompt = f"""You are a vendor agent for cloud infrastructure and AI services.
Your role is to:
1. Present product offerings
2. Provide quotes
3. Negotiate terms
4. Demonstrate compliance

Current conversation: {self.conversation_context}

Message from {message.sender}: {message.content}

Provide a professional, helpful response."""

        return prompt

    async def _fallback_simulated_response(
        self,
        message: AgentMessage,
    ) -> str:
        """Generate a simulated response when LLM is not available."""
        # Fall back to simulated behavior
        import asyncio
        await asyncio.sleep(0.3)
        self.turn_count += 1
        if self.turn_count == 1:
            self.stage = 'greeting'
        elif self.turn_count <= 3:
            self.stage = 'product_info'
        elif self.turn_count <= 5:
            self.stage = 'negotiation'
        elif self.turn_count <= 7:
            self.stage = 'compliance'
        else:
            self.stage = 'closing'
        templates = self.RESPONSE_TEMPLATES.get(
            self.stage, self.RESPONSE_TEMPLATES['greeting']
        )
        response = self.random.choice(templates)
        self.current_thinking = (
            f'Responding to {message.sender}. '
            f'Current stage: {self.stage}. '
            f'Selected from {len(templates)} options.'
        )
        return response

    async def handle_negotiation_offer(
        self,
        offer: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle negotiation offer using MCP if available."""
        try:
            # Generate response quote using MCP if available
            if self.is_mcp_available():
                quote = await self.execute_with_mcp(
                    'generate_quote',
                    {'requirements': offer}
                )
            else:
                quote = await self._execute_direct_api('generate_quote', {'requirements': offer})
            
            return {
                'accepted': True,
                'quote': quote,
                'mcp_used': self.is_mcp_available(),
            }
        except Exception as e:
            logger.error(f"Negotiation handling failed: {e}")
            return {
                'accepted': False,
                'reason': str(e),
                'mcp_used': False,
            }

    async def generate_quote(
        self,
        requirements: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate quote using MCP if available, otherwise direct API."""
        try:
            # Use MCP if available
            if self.is_mcp_available():
                result = await self.execute_with_mcp(
                    'generate_quote',
                    {'requirements': requirements}
                )
            else:
                result = await self._execute_direct_api('generate_quote', {'requirements': requirements})
            
            result['mcp_used'] = self.is_mcp_available()
            return result
        except Exception as e:
            logger.error(f"Quote generation failed: {e}")
            return {
                'price': 2.50,
                'currency': 'USD',
                'service': requirements.get('service', 'default'),
                'mcp_used': False,
                'error': str(e),
            }

    async def check_compliance(
        self,
        requirements: Dict[str, Any],
    ) -> bool:
        """Check compliance using MCP if available, otherwise direct API."""
        try:
            # Use MCP if available
            if self.is_mcp_available():
                result = await self.execute_with_mcp(
                    'check_compliance',
                    {'requirements': requirements}
                )
            else:
                result = await self._execute_direct_api('check_compliance', {'requirements': requirements})
            
            return result.get('compliant', False)
        except Exception as e:
            logger.error(f"Compliance check failed: {e}")
            return False

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

    async def get_thinking(self) -> AgentThinking:
        """Get the current thinking/reasoning state of the agent."""
        return AgentThinking(
            agent_id=self.agent_id,
            reasoning=self.current_thinking,
            confidence=0.85,
            next_actions=[],
        )

    def get_mode(self) -> AgentMode:
        """Get the agent's operation mode.

        Returns:
            AgentMode enum value
        """
        has_llm = hasattr(self, 'llm') and self.llm is not None
        has_glm = hasattr(self, 'glm_client') and self.glm_client is not None
        return AgentMode.LLM if (has_llm or has_glm) else AgentMode.SIMULATED
