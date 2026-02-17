"""
Unit tests for workflow implementations.
"""
import pytest

from app.workflows.flow_storefront import (
    FlowStorefront,
    FlowState,
)
from app.workflows.doc_storefront import DocStorefront
from app.workflows.negotiation_protocol import NegotiationProtocol
from app.comms.schemas import ValidationStatus


@pytest.mark.unit
class TestFlowStorefront:
    """Tests for FlowStorefront (Type A: Flow-Based Store Front)."""

    def test_initialization(self, flow_storefront):
        """Test FlowStorefront initialization."""
        assert flow_storefront.workflow_id == 'test-workflow-001'
        assert flow_storefront.current_state == FlowState.LANDING
        assert flow_storefront.config.get('test_mode') is True

    @pytest.mark.asyncio
    async def test_get_state(self, flow_storefront):
        """Test getting current workflow state."""
        state = await flow_storefront.get_state()
        assert state.workflow_id == 'test-workflow-001'
        assert state.current_state == 'landing'
        assert 'select_category' in state.available_transitions

    @pytest.mark.asyncio
    async def test_valid_transition(self, flow_storefront):
        """Test a valid state transition."""
        step = await flow_storefront.transition_to(FlowState.SELECT_CATEGORY)
        assert step.workflow_id == 'test-workflow-001'
        assert step.step_name == 'select_category'
        assert step.step_status == 'completed'
        assert flow_storefront.current_state == FlowState.SELECT_CATEGORY

    @pytest.mark.asyncio
    async def test_invalid_transition(self, flow_storefront):
        """Test an invalid state transition."""
        step = await flow_storefront.transition_to(FlowState.COMPLETE)
        assert step.step_status == 'failed'
        assert 'Invalid transition' in step.error

    @pytest.mark.asyncio
    async def test_full_workflow(self, flow_storefront):
        """Test running through the complete workflow."""
        # LANDING -> SELECT_CATEGORY
        step1 = await flow_storefront.transition_to(FlowState.SELECT_CATEGORY)
        assert step1.step_status == 'completed'

        # SELECT_CATEGORY -> SELECT_SKU
        step2 = await flow_storefront.transition_to(FlowState.SELECT_SKU)
        assert step2.step_status == 'completed'

        # SELECT_SKU -> POLICY_CHECK
        step3 = await flow_storefront.transition_to(FlowState.POLICY_CHECK)
        assert step3.step_status == 'completed'

        # POLICY_CHECK -> MANIFEST_CHECK
        step4 = await flow_storefront.transition_to(FlowState.MANIFEST_CHECK)
        assert step4.step_status == 'completed'

        # MANIFEST_CHECK -> QUOTE
        step5 = await flow_storefront.transition_to(FlowState.QUOTE)
        assert step5.step_status == 'completed'

        # QUOTE -> CONFIRM_ORDER
        step6 = await flow_storefront.transition_to(FlowState.CONFIRM_ORDER)
        assert step6.step_status == 'completed'

        # CONFIRM_ORDER -> COMPLETE
        step7 = await flow_storefront.transition_to(FlowState.COMPLETE)
        assert step7.step_status == 'completed'

        assert flow_storefront.current_state == FlowState.COMPLETE

    @pytest.mark.asyncio
    async def test_select_category_logic(self, flow_storefront):
        """Test category selection logic."""
        await flow_storefront.transition_to(FlowState.SELECT_CATEGORY)
        assert 'available_categories' in flow_storefront.context
        assert 'selected_category' in flow_storefront.context
        categories = flow_storefront.context['available_categories']
        assert len(categories) > 0
        assert 'compute_gpu' in categories

    @pytest.mark.asyncio
    async def test_select_sku_logic(self, flow_storefront):
        """Test SKU selection logic."""
        await flow_storefront.transition_to(FlowState.SELECT_CATEGORY)
        await flow_storefront.transition_to(FlowState.SELECT_SKU)
        assert 'available_skus' in flow_storefront.context
        assert 'selected_sku' in flow_storefront.context
        skus = flow_storefront.context['available_skus']
        assert len(skus) > 0

    @pytest.mark.asyncio
    async def test_policy_check_logic(self, flow_storefront):
        """Test policy check logic."""
        await flow_storefront.transition_to(FlowState.SELECT_CATEGORY)
        await flow_storefront.transition_to(FlowState.SELECT_SKU)
        step = await flow_storefront.transition_to(FlowState.POLICY_CHECK)
        assert step.step_status == 'completed'
        assert 'policy_valid' in flow_storefront.context
        assert flow_storefront.context['policy_valid'] is True

    @pytest.mark.asyncio
    async def test_manifest_check_logic(self, flow_storefront):
        """Test manifest check logic."""
        await flow_storefront.transition_to(FlowState.SELECT_CATEGORY)
        await flow_storefront.transition_to(FlowState.SELECT_SKU)
        await flow_storefront.transition_to(FlowState.POLICY_CHECK)
        step = await flow_storefront.transition_to(FlowState.MANIFEST_CHECK)
        assert step.step_status == 'completed'
        assert 'manifest_valid' in flow_storefront.context
        assert flow_storefront.context['manifest_valid'] is True

    @pytest.mark.asyncio
    async def test_quote_logic(self, flow_storefront):
        """Test quote generation logic."""
        await flow_storefront.transition_to(FlowState.SELECT_CATEGORY)
        await flow_storefront.transition_to(FlowState.SELECT_SKU)
        await flow_storefront.transition_to(FlowState.POLICY_CHECK)
        await flow_storefront.transition_to(FlowState.MANIFEST_CHECK)
        step = await flow_storefront.transition_to(FlowState.QUOTE)
        assert step.step_status == 'completed'
        assert 'quote_price' in flow_storefront.context
        assert 'quote_currency' in flow_storefront.context
        assert 'quote_duration' in flow_storefront.context

    @pytest.mark.asyncio
    async def test_get_validation_context(self, flow_storefront):
        """Test getting validation context."""
        await flow_storefront.transition_to(FlowState.SELECT_CATEGORY)
        await flow_storefront.transition_to(FlowState.SELECT_SKU)
        await flow_storefront.transition_to(FlowState.POLICY_CHECK)
        await flow_storefront.transition_to(FlowState.MANIFEST_CHECK)

        context = flow_storefront.get_validation_context()
        assert context.validation_status == ValidationStatus.VALID
        assert context.mcp_validated is True
        assert context.tee_validated is True


@pytest.mark.unit
class TestDocStorefront:
    """Tests for DocStorefront (Type C: Documentation-Based Store Front)."""

    def test_initialization(self, doc_storefront):
        """Test DocStorefront initialization."""
        assert doc_storefront.workflow_id == 'test-doc-workflow-001'
        assert doc_storefront.current_stage == 'document_upload'
        assert doc_storefront.config.get('test_mode') is True

    @pytest.mark.asyncio
    async def test_get_state(self, doc_storefront):
        """Test getting current workflow state."""
        state = await doc_storefront.get_state()
        assert state.workflow_id == 'test-doc-workflow-001'
        assert state.current_state == 'document_upload'
        assert 'parse_documents' in state.available_transitions

    @pytest.mark.asyncio
    async def test_valid_transition(self, doc_storefront):
        """Test a valid stage transition."""
        step = await doc_storefront.transition_to('parse_documents')
        assert step.workflow_id == 'test-doc-workflow-001'
        assert step.step_name == 'parse_documents'
        assert step.step_status == 'completed'
        assert doc_storefront.current_stage == 'parse_documents'

    @pytest.mark.asyncio
    async def test_invalid_transition(self, doc_storefront):
        """Test an invalid stage transition."""
        step = await doc_storefront.transition_to('complete')
        assert step.step_status == 'failed'
        assert 'Invalid transition' in step.error

    @pytest.mark.asyncio
    async def test_full_workflow(self, doc_storefront):
        """Test running through the complete workflow."""
        # Add a document first
        await doc_storefront.add_document({
            'name': 'requirements.pdf',
            'type': 'application/pdf',
        })

        # document_upload -> parse_documents
        step1 = await doc_storefront.transition_to('parse_documents')
        assert step1.step_status == 'completed'

        # parse_documents -> review_requirements
        step2 = await doc_storefront.transition_to('review_requirements')
        assert step2.step_status == 'completed'

        # review_requirements -> attach_policy
        step3 = await doc_storefront.transition_to('attach_policy')
        assert step3.step_status == 'completed'

        # attach_policy -> submit_request
        step4 = await doc_storefront.transition_to('submit_request')
        assert step4.step_status == 'completed'

        # submit_request -> complete
        step5 = await doc_storefront.transition_to('complete')
        assert step5.step_status == 'completed'

        assert doc_storefront.current_stage == 'complete'

    @pytest.mark.asyncio
    async def test_parse_documents(self, doc_storefront):
        """Test document parsing logic."""
        await doc_storefront.add_document({
            'name': 'requirements.pdf',
            'type': 'application/pdf',
        })
        step = await doc_storefront.transition_to('parse_documents')
        assert step.step_status == 'completed'
        assert 'parsed_requirements' in doc_storefront.context

    @pytest.mark.asyncio
    async def test_review_requirements(self, doc_storefront):
        """Test requirements review logic."""
        await doc_storefront.add_document({
            'name': 'requirements.pdf',
            'type': 'application/pdf',
        })
        await doc_storefront.transition_to('parse_documents')
        step = await doc_storefront.transition_to('review_requirements')
        assert step.step_status == 'completed'
        assert 'ai_documentation' in doc_storefront.context
        assert 'requirements_reviewed' in doc_storefront.context

    @pytest.mark.asyncio
    async def test_attach_policy(self, doc_storefront):
        """Test policy attachment logic."""
        await doc_storefront.add_document({
            'name': 'requirements.pdf',
            'type': 'application/pdf',
        })
        await doc_storefront.transition_to('parse_documents')
        await doc_storefront.transition_to('review_requirements')
        step = await doc_storefront.transition_to('attach_policy')
        assert step.step_status == 'completed'
        assert 'policy_manifest' in doc_storefront.context
        assert 'policy_attached' in doc_storefront.context

    @pytest.mark.asyncio
    async def test_submit_request(self, doc_storefront):
        """Test request submission logic."""
        await doc_storefront.add_document({
            'name': 'requirements.pdf',
            'type': 'application/pdf',
        })
        await doc_storefront.transition_to('parse_documents')
        await doc_storefront.transition_to('review_requirements')
        await doc_storefront.transition_to('attach_policy')
        step = await doc_storefront.transition_to('submit_request')
        assert step.step_status == 'completed'
        assert 'procurement_request' in doc_storefront.context
        assert 'request_submitted' in doc_storefront.context
        assert 'request_id' in doc_storefront.context

    @pytest.mark.asyncio
    async def test_get_validation_context(self, doc_storefront):
        """Test getting validation context."""
        await doc_storefront.add_document({
            'name': 'requirements.pdf',
            'type': 'application/pdf',
        })
        await doc_storefront.transition_to('parse_documents')
        await doc_storefront.transition_to('review_requirements')
        await doc_storefront.transition_to('attach_policy')
        await doc_storefront.transition_to('submit_request')

        context = doc_storefront.get_validation_context()
        assert context.validation_status == ValidationStatus.VALID
        assert context.policy_id == 'policy-doc-001'


@pytest.mark.unit
class TestNegotiationProtocol:
    """Tests for NegotiationProtocol."""

    def test_initialization(self, negotiation_protocol):
        """Test NegotiationProtocol initialization."""
        assert negotiation_protocol.protocol_id == 'test-negotiation-001'
        assert negotiation_protocol.max_turns == 10
        assert negotiation_protocol.turn_count == 0
        assert negotiation_protocol.agreed_terms is None

    @pytest.mark.asyncio
    async def test_create_offer(self, negotiation_protocol):
        """Test creating a negotiation offer."""
        offer = await negotiation_protocol.create_offer(
            from_agent='procurement_agent',
            terms={'price': 1500, 'availability': 99.9},
        )
        assert offer.offer_id == 'offer-1'
        assert offer.from_agent == 'procurement_agent'
        assert offer.terms['price'] == 1500
        assert negotiation_protocol.turn_count == 1

    @pytest.mark.asyncio
    async def test_respond_to_offer(self, negotiation_protocol):
        """Test responding to a negotiation offer."""
        offer = await negotiation_protocol.create_offer(
            from_agent='procurement_agent',
            terms={'price': 1500},
        )
        response = await negotiation_protocol.respond_to_offer(
            offer=offer,
            response_type='accept',
            reasoning='Offer meets our requirements.',
        )
        assert response.offer_id == 'offer-1'
        assert response.response_type == 'accept'
        assert response.reasoning == 'Offer meets our requirements.'

    @pytest.mark.asyncio
    async def test_validate_offer_valid(self, negotiation_protocol):
        """Test validating an offer that passes constraints."""
        offer = await negotiation_protocol.create_offer(
            from_agent='procurement_agent',
            terms={'price': 4000, 'availability': 99.9, 'region': 'us-east-1'},
        )
        is_valid, errors = await negotiation_protocol.validate_offer(
            offer=offer,
            policy_constraints=['max_price=5000', 'min_availability=99.5'],
        )
        assert is_valid is True
        assert len(errors) == 0

    @pytest.mark.asyncio
    async def test_validate_offer_invalid_price(self, negotiation_protocol):
        """Test validating an offer that fails price constraint."""
        offer = await negotiation_protocol.create_offer(
            from_agent='procurement_agent',
            terms={'price': 6000, 'availability': 99.9},
        )
        is_valid, errors = await negotiation_protocol.validate_offer(
            offer=offer,
            policy_constraints=['max_price=5000'],
        )
        assert is_valid is False
        assert len(errors) > 0
        assert 'max_price' in errors[0]

    @pytest.mark.asyncio
    async def test_validate_offer_invalid_availability(
        self, negotiation_protocol
    ):
        """Test validating an offer that fails availability constraint."""
        offer = await negotiation_protocol.create_offer(
            from_agent='procurement_agent',
            terms={'price': 4000, 'availability': 99.0},
        )
        is_valid, errors = await negotiation_protocol.validate_offer(
            offer=offer,
            policy_constraints=['min_availability=99.5'],
        )
        assert is_valid is False
        assert len(errors) > 0
        assert 'min_availability' in errors[0]

    @pytest.mark.asyncio
    async def test_validate_offer_invalid_region(self, negotiation_protocol):
        """Test validating an offer that fails region constraint."""
        offer = await negotiation_protocol.create_offer(
            from_agent='procurement_agent',
            terms={'price': 4000, 'region': 'eu-west-1'},
        )
        is_valid, errors = await negotiation_protocol.validate_offer(
            offer=offer,
            policy_constraints=['region=us-east-1,us-west-2'],
        )
        assert is_valid is False
        assert len(errors) > 0
        assert 'region' in errors[0]

    @pytest.mark.asyncio
    async def test_calculate_concession(self, negotiation_protocol):
        """Test calculating concession percentage."""
        offer = await negotiation_protocol.create_offer(
            from_agent='procurement_agent',
            terms={'price': 1000},
        )
        counter_offer = {'price': 900}
        concession = await negotiation_protocol.calculate_concession(
            offer=offer,
            counter_offer=counter_offer,
        )
        assert concession == 0.1

    @pytest.mark.asyncio
    async def test_is_complete_false(self, negotiation_protocol):
        """Test checking if negotiation is complete (not complete)."""
        is_complete = await negotiation_protocol.is_complete()
        assert is_complete is False

    @pytest.mark.asyncio
    async def test_is_complete_max_turns(self, negotiation_protocol):
        """Test checking if negotiation is complete (max turns)."""
        # Simulate reaching max turns
        negotiation_protocol.turn_count = 10
        is_complete = await negotiation_protocol.is_complete()
        assert is_complete is True

    @pytest.mark.asyncio
    async def test_get_agreement_none(self, negotiation_protocol):
        """Test getting agreement when none exists."""
        agreement = await negotiation_protocol.get_agreement()
        assert agreement is None

    def test_get_history(self, negotiation_protocol):
        """Test getting negotiation history."""
        history = negotiation_protocol.get_history()
        assert isinstance(history, list)
        assert len(history) == 0
