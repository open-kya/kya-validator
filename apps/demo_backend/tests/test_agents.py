"""
Unit tests for agent implementations.
"""
import pytest

from app.comms.schemas import (
    AgentMode,
    AgentMessage,
    ProcurementRequest,
    ProcurementDecision,
    ValidationContext,
    ValidationStatus,
)
from app.agents.agent_interfaces import AgentFactory
from app.agents.procurement_agent import (
    SimulatedProcurementAgent,
    LLMProcurementAgent,
)
from app.agents.recipient_agent import (
    SimulatedRecipientAgent,
    LLMRecipientAgent,
)


@pytest.mark.unit
class TestAgentFactory:
    """Tests for AgentFactory."""

    def test_create_simulated_procurement_agent(self):
        """Test creating a simulated procurement agent."""
        agent = AgentFactory.create_procurement_agent(
            mode=AgentMode.SIMULATED,
            config={'scenario_id': 'test_scenario'},
        )
        assert isinstance(agent, SimulatedProcurementAgent)
        assert agent.agent_id == 'procurement_agent'
        assert agent.config.get('scenario_id') == 'test_scenario'

    def test_create_llm_procurement_agent(self):
        """Test creating an LLM procurement agent."""
        agent = AgentFactory.create_procurement_agent(
            mode=AgentMode.LLM,
            config={'scenario_id': 'test_scenario'},
        )
        # LLM agent will fall back to simulated if no API key
        assert isinstance(agent, LLMProcurementAgent)

    def test_create_simulated_recipient_agent(self):
        """Test creating a simulated recipient agent."""
        agent = AgentFactory.create_recipient_agent(
            mode=AgentMode.SIMULATED,
            config={'scenario_id': 'test_scenario'},
        )
        assert isinstance(agent, SimulatedRecipientAgent)
        assert agent.agent_id == 'recipient_agent'

    def test_create_llm_recipient_agent(self):
        """Test creating an LLM recipient agent."""
        agent = AgentFactory.create_recipient_agent(
            mode=AgentMode.LLM,
            config={'scenario_id': 'test_scenario'},
        )
        # LLM agent will fall back to simulated if no API key
        assert isinstance(agent, LLMRecipientAgent)


@pytest.mark.unit
class TestSimulatedProcurementAgent:
    """Tests for SimulatedProcurementAgent."""

    @pytest.mark.asyncio
    async def test_process_message(self, simulated_procurement_agent, agent_message):
        """Test processing a message."""
        response = await simulated_procurement_agent.process_message(
            agent_message
        )
        assert isinstance(response, AgentMessage)
        assert response.sender == 'procurement_agent'
        assert response.recipient == agent_message.sender
        assert isinstance(response.content, str)
        assert len(response.content) > 0

    @pytest.mark.asyncio
    async def test_process_message_multiple_turns(
        self, simulated_procurement_agent, agent_message
    ):
        """Test processing messages across multiple turns."""
        # First turn
        response1 = await simulated_procurement_agent.process_message(
            agent_message
        )
        assert response1.content

        # Second turn
        response2 = await simulated_procurement_agent.process_message(
            agent_message
        )
        assert response2.content

        # Check that turn count increased
        assert simulated_procurement_agent.turn_count == 2

    @pytest.mark.asyncio
    async def test_get_thinking(self, simulated_procurement_agent):
        """Test getting agent thinking."""
        thinking = await simulated_procurement_agent.get_thinking()
        assert thinking.agent_id == 'procurement_agent'
        assert isinstance(thinking.reasoning, str)
        assert 0.0 <= thinking.confidence <= 1.0

    def test_get_mode(self, simulated_procurement_agent):
        """Test getting agent mode."""
        mode = simulated_procurement_agent.get_mode()
        assert mode == AgentMode.SIMULATED

    @pytest.mark.asyncio
    async def test_handle_procurement_request_approve(
        self, simulated_procurement_agent, high_budget_procurement_request
    ):
        """Test handling a procurement request with high budget."""
        decision = await simulated_procurement_agent.handle_procurement_request(
            high_budget_procurement_request
        )
        assert isinstance(decision, ProcurementDecision)
        assert decision.decision == 'approve'
        assert decision.vendor == 'demo_vendor'
        assert decision.confidence >= 0.8

    @pytest.mark.asyncio
    async def test_handle_procurement_request_negotiate(
        self, simulated_procurement_agent, procurement_request
    ):
        """Test handling a procurement request with medium budget."""
        decision = await simulated_procurement_agent.handle_procurement_request(
            procurement_request
        )
        assert isinstance(decision, ProcurementDecision)
        assert decision.decision == 'negotiate'
        assert decision.confidence >= 0.6

    @pytest.mark.asyncio
    async def test_handle_procurement_request_reject(
        self, simulated_procurement_agent, low_budget_procurement_request
    ):
        """Test handling a procurement request with low budget."""
        decision = await simulated_procurement_agent.handle_procurement_request(
            low_budget_procurement_request
        )
        assert isinstance(decision, ProcurementDecision)
        assert decision.decision == 'reject'
        assert decision.confidence >= 0.9

    @pytest.mark.asyncio
    async def test_validate_manifest(
        self, simulated_procurement_agent, valid_manifest_data
    ):
        """Test validating a manifest."""
        context = await simulated_procurement_agent.validate_manifest(
            valid_manifest_data
        )
        assert isinstance(context, ValidationContext)
        assert context.manifest_id == 'manifest-001'
        assert context.validation_status in [
            ValidationStatus.VALID,
            ValidationStatus.INVALID,
        ]

    @pytest.mark.asyncio
    async def test_validate_policy(
        self, simulated_procurement_agent, policy_data
    ):
        """Test validating a policy."""
        context = await simulated_procurement_agent.validate_policy(
            policy_data
        )
        assert isinstance(context, ValidationContext)
        assert context.policy_id == 'policy-001'
        assert context.validation_status in [
            ValidationStatus.VALID,
            ValidationStatus.INVALID,
        ]

    @pytest.mark.asyncio
    async def test_negotiate(self, simulated_procurement_agent):
        """Test negotiation."""
        offer = {'price': 1500, 'availability': 99.9}
        constraints = ['max_price=2000', 'min_availability=99.5']
        result = await simulated_procurement_agent.negotiate(offer, constraints)
        assert isinstance(result, dict)
        assert 'response_type' in result
        assert result['response_type'] in ['accept', 'counter']


@pytest.mark.unit
class TestSimulatedRecipientAgent:
    """Tests for SimulatedRecipientAgent."""

    @pytest.mark.asyncio
    async def test_process_message(
        self, simulated_recipient_agent, agent_message
    ):
        """Test processing a message."""
        # Modify message to be from procurement agent
        agent_message.sender = 'procurement_agent'
        agent_message.recipient = 'recipient_agent'

        response = await simulated_recipient_agent.process_message(agent_message)
        assert isinstance(response, AgentMessage)
        assert response.sender == 'recipient_agent'
        assert response.recipient == agent_message.sender
        assert isinstance(response.content, str)
        assert len(response.content) > 0

    @pytest.mark.asyncio
    async def test_get_thinking(self, simulated_recipient_agent):
        """Test getting agent thinking."""
        thinking = await simulated_recipient_agent.get_thinking()
        assert thinking.agent_id == 'recipient_agent'
        assert isinstance(thinking.reasoning, str)
        assert 0.0 <= thinking.confidence <= 1.0

    def test_get_mode(self, simulated_recipient_agent):
        """Test getting agent mode."""
        mode = simulated_recipient_agent.get_mode()
        assert mode == AgentMode.SIMULATED

    @pytest.mark.asyncio
    async def test_handle_negotiation_offer_accept(
        self, simulated_recipient_agent
    ):
        """Test handling a negotiation offer that should be accepted."""
        offer = {'price': 600, 'availability': 99.9}
        result = await simulated_recipient_agent.handle_negotiation_offer(
            offer
        )
        assert isinstance(result, dict)
        assert result['response_type'] == 'counter'
        assert 'reasoning' in result

    @pytest.mark.asyncio
    async def test_handle_negotiation_offer_counter(
        self, simulated_recipient_agent
    ):
        """Test handling a negotiation offer that should be countered."""
        offer = {'price': 1000, 'availability': 99.9}
        result = await simulated_recipient_agent.handle_negotiation_offer(
            offer
        )
        assert isinstance(result, dict)
        assert result['response_type'] == 'counter'
        assert 'counter_terms' in result
        assert 'reasoning' in result

    @pytest.mark.asyncio
    async def test_generate_quote(self, simulated_recipient_agent):
        """Test generating a quote."""
        requirements = {
            'service_type': 'gpu_compute',
            'gpu_type': 'A100',
            'quantity': 4,
        }
        quote = await simulated_recipient_agent.generate_quote(requirements)
        assert isinstance(quote, dict)
        assert 'service' in quote
        assert 'tier' in quote
        assert 'base_price' in quote
        assert 'discount' in quote
        assert 'quantity' in quote

    @pytest.mark.asyncio
    async def test_generate_quote_gpu(self, simulated_recipient_agent):
        """Test generating a quote for GPU services."""
        requirements = {'service_type': 'gpu_compute'}
        quote = await simulated_recipient_agent.generate_quote(requirements)
        # GPU compute base_price is 2.50, default quantity is 100
        assert quote['final_price'] == 250.0

    @pytest.mark.asyncio
    async def test_generate_quote_inference(
        self, simulated_recipient_agent
    ):
        """Test generating a quote for inference services."""
        requirements = {'service_type': 'inference_services'}
        quote = await simulated_recipient_agent.generate_quote(requirements)
        # Inference services base_price is 1.00, default quantity is 100
        assert quote['final_price'] == 100.0

    @pytest.mark.asyncio
    async def test_check_compliance(self, simulated_recipient_agent):
        """Test checking compliance."""
        requirements = {
            'service_type': 'gpu_compute',
            'region': 'us-east-1',
        }
        is_compliant = await simulated_recipient_agent.check_compliance(
            requirements
        )
        assert isinstance(is_compliant, bool)


@pytest.mark.unit
class TestLLMProcurementAgent:
    """Tests for LLMProcurementAgent."""

    @pytest.mark.asyncio
    async def test_fallback_to_simulated(self):
        """Test that LLM agent falls back to simulated without API key."""
        agent = LLMProcurementAgent(config={})
        assert agent.llm is None

        message = AgentMessage(
            sender='user',
            recipient='procurement_agent',
            content='Test message',
        )
        response = await agent.process_message(message)
        assert isinstance(response, AgentMessage)
        assert response.sender == 'procurement_agent'

    @pytest.mark.skip(reason="Requires GLM_API_KEY to be unset in settings")
    def test_get_mode_without_llm(self):
        """Test getting mode when LLM is not available."""
        agent = LLMProcurementAgent(config={})
        mode = agent.get_mode()
        assert mode == AgentMode.SIMULATED


@pytest.mark.unit
class TestLLMRecipientAgent:
    """Tests for LLMRecipientAgent."""

    @pytest.mark.asyncio
    async def test_fallback_to_simulated(self):
        """Test that LLM agent falls back to simulated without API key."""
        agent = LLMRecipientAgent(config={})
        assert agent.llm is None

        message = AgentMessage(
            sender='procurement_agent',
            recipient='recipient_agent',
            content='Test message',
        )
        response = await agent.process_message(message)
        assert isinstance(response, AgentMessage)
        assert response.sender == 'recipient_agent'

    @pytest.mark.skip(reason="Requires GLM_API_KEY to be unset in settings")
    def test_get_mode_without_llm(self):
        """Test getting mode when LLM is not available."""
        agent = LLMRecipientAgent(config={})
        mode = agent.get_mode()
        assert mode == AgentMode.SIMULATED
