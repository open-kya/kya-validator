"""
Unit tests for communication layer (schemas and state store).
"""
import pytest

from app.comms.schemas import (
    AgentMode,
    ClientType,
    MessageType,
    ValidationStatus,
    Severity,
    AgentMessage,
    AgentThinking,
    ValidationContext,
    ValidationRequest,
    ValidationResponse,
    WorkflowState,
    WorkflowStep,
    NegotiationOffer,
    NegotiationResponse,
    SessionStart,
    SessionEnd,
    ErrorMessage,
    ProcurementRequest,
    ProcurementDecision,
)
from app.comms.state_store import Session, StateStore, state_store


@pytest.mark.unit
class TestSchemas:
    """Tests for Pydantic schemas."""

    def test_agent_mode_enum(self):
        """Test AgentMode enum values."""
        assert AgentMode.LLM == 'llm'
        assert AgentMode.SIMULATED == 'simulated'

    def test_client_type_enum(self):
        """Test ClientType enum values."""
        assert ClientType.FLOW_STOREFRONT == 'flow_storefront'
        assert ClientType.AGENT_RECEIVER == 'agent_receiver'
        assert ClientType.DOC_STOREFRONT == 'doc_storefront'

    def test_message_type_enum(self):
        """Test MessageType enum values."""
        assert MessageType.AGENT_MESSAGE == 'agent_message'
        assert MessageType.VALIDATION_REQUEST == 'validation_request'
        assert MessageType.HEARTBEAT == 'heartbeat'

    def test_validation_status_enum(self):
        """Test ValidationStatus enum values."""
        assert ValidationStatus.PENDING == 'pending'
        assert ValidationStatus.VALID == 'valid'
        assert ValidationStatus.INVALID == 'invalid'
        assert ValidationStatus.ERROR == 'error'

    def test_severity_enum(self):
        """Test Severity enum values."""
        assert Severity.INFO == 'info'
        assert Severity.WARNING == 'warning'
        assert Severity.ERROR == 'error'
        assert Severity.CRITICAL == 'critical'

    def test_agent_message_creation(self):
        """Test creating an AgentMessage."""
        message = AgentMessage(
            sender='user',
            recipient='agent',
            content='Hello',
        )
        assert message.sender == 'user'
        assert message.recipient == 'agent'
        assert message.content == 'Hello'
        assert message.message_type == MessageType.AGENT_MESSAGE
        assert message.message_id is not None

    def test_agent_message_with_validation_context(self):
        """Test creating an AgentMessage with validation context."""
        context = ValidationContext(
            manifest_id='manifest-001',
            validation_status=ValidationStatus.VALID,
        )
        message = AgentMessage(
            sender='user',
            recipient='agent',
            content='Hello',
            validation_context=context,
        )
        assert message.validation_context is not None
        assert message.validation_context.manifest_id == 'manifest-001'

    def test_agent_thinking_creation(self):
        """Test creating an AgentThinking message."""
        thinking = AgentThinking(
            agent_id='agent-001',
            reasoning='Analyzing request...',
            confidence=0.85,
            next_actions=['validate', 'respond'],
        )
        assert thinking.agent_id == 'agent-001'
        assert thinking.reasoning == 'Analyzing request...'
        assert thinking.confidence == 0.85
        assert len(thinking.next_actions) == 2

    def test_validation_context_creation(self):
        """Test creating a ValidationContext."""
        context = ValidationContext(
            manifest_id='manifest-001',
            policy_id='policy-001',
            validation_status=ValidationStatus.VALID,
            mcp_validated=True,
            tee_validated=True,
            blockchain_validated=True,
        )
        assert context.manifest_id == 'manifest-001'
        assert context.policy_id == 'policy-001'
        assert context.validation_status == ValidationStatus.VALID
        assert context.mcp_validated is True
        assert context.tee_validated is True
        assert context.blockchain_validated is True

    def test_validation_context_with_errors(self):
        """Test creating a ValidationContext with errors."""
        context = ValidationContext(
            manifest_id='manifest-001',
            validation_status=ValidationStatus.INVALID,
            validation_errors=[
                {
                    'code': 'SCHEMA_ERROR',
                    'message': 'Invalid schema',
                    'severity': 'error',
                }
            ],
        )
        assert context.validation_status == ValidationStatus.INVALID
        assert len(context.validation_errors) == 1
        assert context.validation_errors[0]['code'] == 'SCHEMA_ERROR'

    def test_validation_request_creation(self):
        """Test creating a ValidationRequest."""
        request = ValidationRequest(
            manifest_data={'id': 'manifest-001', 'version': '1.0'},
            policy_data={'id': 'policy-001'},
            validation_type='manifest',
        )
        assert request.manifest_data['id'] == 'manifest-001'
        assert request.policy_data['id'] == 'policy-001'
        assert request.validation_type == 'manifest'

    def test_validation_response_creation(self):
        """Test creating a ValidationResponse."""
        response = ValidationResponse(
            request_id='req-001',
            validation_status=ValidationStatus.VALID,
            errors=[],
            warnings=[],
            metadata={'validator_version': '1.0'},
        )
        assert response.request_id == 'req-001'
        assert response.validation_status == ValidationStatus.VALID

    def test_workflow_state_creation(self):
        """Test creating a WorkflowState."""
        state = WorkflowState(
            workflow_id='workflow-001',
            current_state='select_category',
            available_transitions=['select_sku', 'cancel'],
            context={'selected_category': 'gpu'},
        )
        assert state.workflow_id == 'workflow-001'
        assert state.current_state == 'select_category'
        assert len(state.available_transitions) == 2

    def test_workflow_step_creation(self):
        """Test creating a WorkflowStep."""
        step = WorkflowStep(
            workflow_id='workflow-001',
            step_name='select_category',
            step_status='completed',
            result={'selected': 'gpu'},
        )
        assert step.workflow_id == 'workflow-001'
        assert step.step_name == 'select_category'
        assert step.step_status == 'completed'

    def test_workflow_step_with_error(self):
        """Test creating a WorkflowStep with error."""
        step = WorkflowStep(
            workflow_id='workflow-001',
            step_name='select_category',
            step_status='failed',
            error='Invalid selection',
        )
        assert step.step_status == 'failed'
        assert step.error == 'Invalid selection'

    def test_negotiation_offer_creation(self):
        """Test creating a NegotiationOffer."""
        offer = NegotiationOffer(
            offer_id='offer-001',
            from_agent='procurement_agent',
            terms={'price': 1500, 'duration': '12 months'},
            constraints=['max_price=2000'],
        )
        assert offer.offer_id == 'offer-001'
        assert offer.from_agent == 'procurement_agent'
        assert offer.terms['price'] == 1500

    def test_negotiation_response_creation(self):
        """Test creating a NegotiationResponse."""
        response = NegotiationResponse(
            offer_id='offer-001',
            response_type='accept',
            reasoning='Offer meets requirements',
            counter_terms=None,
        )
        assert response.offer_id == 'offer-001'
        assert response.response_type == 'accept'

    def test_negotiation_response_counter(self):
        """Test creating a NegotiationResponse with counter offer."""
        response = NegotiationResponse(
            offer_id='offer-001',
            response_type='counter',
            reasoning='Price too high',
            counter_terms={'price': 1350},
        )
        assert response.response_type == 'counter'
        assert response.counter_terms['price'] == 1350

    def test_session_start_creation(self):
        """Test creating a SessionStart message."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
            scenario_config={'scenario_id': 'default'},
        )
        assert session_start.session_id == 'session-001'
        assert session_start.agent_mode == AgentMode.SIMULATED
        assert session_start.client_type == ClientType.FLOW_STOREFRONT

    def test_session_end_creation(self):
        """Test creating a SessionEnd message."""
        session_end = SessionEnd(
            session_id='session-001',
            reason='User completed workflow',
            final_state={'status': 'success'},
        )
        assert session_end.session_id == 'session-001'
        assert session_end.reason == 'User completed workflow'

    def test_error_message_creation(self):
        """Test creating an ErrorMessage."""
        error = ErrorMessage(
            error_code='VALIDATION_ERROR',
            error_message='Manifest validation failed',
            severity=Severity.ERROR,
            details={'field': 'version'},
        )
        assert error.error_code == 'VALIDATION_ERROR'
        assert error.error_message == 'Manifest validation failed'
        assert error.severity == Severity.ERROR

    def test_procurement_request_creation(self):
        """Test creating a ProcurementRequest."""
        request = ProcurementRequest(
            requirements={'service_type': 'gpu_compute', 'quantity': 4},
            constraints=['max_price=5000'],
            preferences={'region': 'us-east-1'},
            budget=4000.0,
        )
        assert request.requirements['service_type'] == 'gpu_compute'
        assert request.budget == 4000.0

    def test_procurement_decision_creation(self):
        """Test creating a ProcurementDecision."""
        decision = ProcurementDecision(
            decision='approve',
            vendor='vendor-001',
            terms={'price': 4000, 'duration': '12 months'},
            reasoning='All requirements met',
            validation_artifacts={'manifest_id': 'manifest-001'},
            confidence=0.9,
        )
        assert decision.decision == 'approve'
        assert decision.vendor == 'vendor-001'
        assert decision.confidence == 0.9


@pytest.mark.unit
class TestSession:
    """Tests for Session class."""

    def test_session_creation(self):
        """Test creating a Session."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        session = Session('session-001', session_start)
        assert session.session_id == 'session-001'
        assert session.agent_mode == AgentMode.SIMULATED
        assert session.client_type == ClientType.FLOW_STOREFRONT
        assert session.is_active is True
        assert session.current_turn == 0

    def test_add_message(self):
        """Test adding a message to a session."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        session = Session('session-001', session_start)
        message = AgentMessage(
            sender='user',
            recipient='agent',
            content='Hello',
        )
        session.add_message(message)
        assert len(session.messages) == 1
        assert session.current_turn == 1

    def test_update_workflow_state(self):
        """Test updating workflow state."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        session = Session('session-001', session_start)
        session.update_workflow_state('select_category', {'selected': 'gpu'})
        assert session.workflow_state == 'select_category'
        assert session.workflow_context['selected'] == 'gpu'

    def test_set_validation_context(self):
        """Test setting validation context."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        session = Session('session-001', session_start)
        context = ValidationContext(
            manifest_id='manifest-001',
            validation_status=ValidationStatus.VALID,
        )
        session.set_validation_context(context)
        assert session.validation_context.manifest_id == 'manifest-001'

    def test_to_dict(self):
        """Test converting session to dictionary."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        session = Session('session-001', session_start)
        session_dict = session.to_dict()
        assert session_dict['session_id'] == 'session-001'
        assert session_dict['agent_mode'] == 'simulated'
        assert session_dict['client_type'] == 'flow_storefront'
        assert 'created_at' in session_dict
        assert 'updated_at' in session_dict


@pytest.mark.unit
@pytest.mark.asyncio
class TestStateStore:
    """Tests for StateStore class."""

    async def test_create_session(self, clean_state_store):
        """Test creating a session."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        session = await state_store.create_session(
            'session-001', session_start
        )
        assert session.session_id == 'session-001'
        assert len(state_store.sessions) == 1

    async def test_get_session(self, clean_state_store):
        """Test getting a session."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        await state_store.create_session('session-001', session_start)
        session = await state_store.get_session('session-001')
        assert session is not None
        assert session.session_id == 'session-001'

    async def test_get_nonexistent_session(self, clean_state_store):
        """Test getting a nonexistent session."""
        session = await state_store.get_session('nonexistent')
        assert session is None

    async def test_update_session(self, clean_state_store):
        """Test updating a session."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        await state_store.create_session('session-001', session_start)
        session = await state_store.update_session(
            'session-001', is_active=False
        )
        assert session.is_active is False

    async def test_end_session(self, clean_state_store):
        """Test ending a session."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        await state_store.create_session('session-001', session_start)
        session = await state_store.end_session('session-001')
        assert session.is_active is False

    async def test_add_message(self, clean_state_store):
        """Test adding a message to a session."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        await state_store.create_session('session-001', session_start)
        message = AgentMessage(
            sender='user',
            recipient='agent',
            content='Hello',
        )
        result = await state_store.add_message('session-001', message)
        assert result is True

    async def test_get_messages(self, clean_state_store):
        """Test getting messages from a session."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        await state_store.create_session('session-001', session_start)
        message = AgentMessage(
            sender='user',
            recipient='agent',
            content='Hello',
        )
        await state_store.add_message('session-001', message)
        messages = await state_store.get_messages('session-001')
        assert len(messages) == 1
        assert messages[0].content == 'Hello'

    async def test_get_active_sessions(self, clean_state_store):
        """Test getting all active sessions."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        await state_store.create_session('session-001', session_start)
        active_sessions = await state_store.get_active_sessions()
        assert len(active_sessions) == 1
        assert active_sessions[0].session_id == 'session-001'

    async def test_cleanup_inactive_sessions(self, clean_state_store):
        """Test cleaning up inactive sessions."""
        session_start = SessionStart(
            session_id='session-001',
            agent_mode=AgentMode.SIMULATED,
            client_type=ClientType.FLOW_STOREFRONT,
        )
        await state_store.create_session('session-001', session_start)
        await state_store.end_session('session-001')
        await state_store.cleanup_inactive_sessions(timeout_seconds=0)
        assert len(state_store.sessions) == 0

    async def test_register_websocket(self, clean_state_store):
        """Test registering a websocket connection."""
        await state_store.register_websocket('session-001', 'mock_websocket')
        ws = await state_store.get_websocket('session-001')
        assert ws == 'mock_websocket'

    async def test_unregister_websocket(self, clean_state_store):
        """Test unregistering a websocket connection."""
        await state_store.register_websocket('session-001', 'mock_websocket')
        await state_store.unregister_websocket('session-001')
        ws = await state_store.get_websocket('session-001')
        assert ws is None
