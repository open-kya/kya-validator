"""
Pytest configuration and shared fixtures for KYA Validator Demo Backend tests.
"""
import asyncio
from datetime import datetime
from typing import AsyncGenerator, Generator

import pytest
from httpx import ASGITransport, AsyncClient
from fastapi import FastAPI

from app.main import app
from app.comms.schemas import (
    AgentMode,
    ClientType,
    AgentMessage,
    SessionStart,
    ProcurementRequest,
    ValidationContext,
    ValidationStatus,
)
from app.comms.state_store import state_store, Session
from app.agents.agent_interfaces import AgentFactory
from app.workflows.flow_storefront import FlowStorefront
from app.workflows.doc_storefront import DocStorefront
from app.workflows.negotiation_protocol import NegotiationProtocol
from app.validation.manifest_validator import ManifestValidator


# ============================================================================
# Fixtures for FastAPI app and HTTP client
# ============================================================================

@pytest.fixture
def test_app() -> FastAPI:
    """Get the FastAPI test application."""
    return app


@pytest.fixture
async def async_client(test_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing."""
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url='http://test',
    ) as client:
        yield client


# ============================================================================
# Fixtures for state store and sessions
# ============================================================================

@pytest.fixture
async def clean_state_store() -> AsyncGenerator[None, None]:
    """Clean state store before and after tests."""
    # Clear all sessions
    state_store.sessions.clear()
    state_store.websocket_connections.clear()
    yield
    # Clean up after test
    state_store.sessions.clear()
    state_store.websocket_connections.clear()


@pytest.fixture
async def sample_session(clean_state_store) -> Session:
    """Create a sample session for testing."""
    session_start = SessionStart(
        session_id='test-session-123',
        agent_mode=AgentMode.SIMULATED,
        client_type=ClientType.FLOW_STOREFRONT,
        scenario_config={'scenario_id': 'test_scenario'},
    )
    session = await state_store.create_session(
        'test-session-123', session_start
    )
    return session


@pytest.fixture
def session_start_data() -> dict:
    """Sample session start data."""
    return {
        'session_id': 'test-session-123',
        'agent_mode': 'simulated',
        'client_type': 'flow_storefront',
        'scenario_config': {'scenario_id': 'test_scenario'},
    }


# ============================================================================
# Fixtures for agent messages
# ============================================================================

@pytest.fixture
def agent_message() -> AgentMessage:
    """Create a sample agent message."""
    return AgentMessage(
        sender='user',
        recipient='procurement_agent',
        content='I need cloud infrastructure services.',
    )


@pytest.fixture
def agent_message_with_validation() -> AgentMessage:
    """Create an agent message with validation context."""
    return AgentMessage(
        sender='user',
        recipient='procurement_agent',
        content='Please validate this manifest.',
        validation_context=ValidationContext(
            manifest_id='manifest-001',
            validation_status=ValidationStatus.PENDING,
        ),
    )


# ============================================================================
# Fixtures for procurement requests
# ============================================================================

@pytest.fixture
def procurement_request() -> ProcurementRequest:
    """Create a sample procurement request."""
    return ProcurementRequest(
        requirements={
            'service_type': 'gpu_compute',
            'gpu_type': 'A100',
            'quantity': 4,
        },
        constraints=['max_price=5000', 'region=us-east-1'],
        budget=750.0,  # Medium budget for 'negotiate' decision
    )


@pytest.fixture
def high_budget_procurement_request() -> ProcurementRequest:
    """Create a high budget procurement request."""
    return ProcurementRequest(
        requirements={
            'service_type': 'gpu_compute',
            'gpu_type': 'H100',
            'quantity': 8,
        },
        constraints=['max_price=10000', 'region=us-east-1'],
        budget=8000.0,
    )


@pytest.fixture
def low_budget_procurement_request() -> ProcurementRequest:
    """Create a low budget procurement request."""
    return ProcurementRequest(
        requirements={
            'service_type': 'gpu_compute',
            'gpu_type': 'A100',
            'quantity': 4,
        },
        constraints=['max_price=1000', 'region=us-east-1'],
        budget=300.0,
    )


# ============================================================================
# Fixtures for agents
# ============================================================================

@pytest.fixture
def simulated_procurement_agent():
    """Create a simulated procurement agent."""
    return AgentFactory.create_procurement_agent(
        mode=AgentMode.SIMULATED,
        config={'scenario_id': 'test_scenario'},
    )


@pytest.fixture
def simulated_recipient_agent():
    """Create a simulated recipient agent."""
    return AgentFactory.create_recipient_agent(
        mode=AgentMode.SIMULATED,
        config={'scenario_id': 'test_scenario'},
    )


# ============================================================================
# Fixtures for workflows
# ============================================================================

@pytest.fixture
def flow_storefront():
    """Create a FlowStorefront instance."""
    return FlowStorefront(
        workflow_id='test-workflow-001',
        config={'test_mode': True},
    )


@pytest.fixture
def doc_storefront():
    """Create a DocStorefront instance."""
    return DocStorefront(
        workflow_id='test-doc-workflow-001',
        config={'test_mode': True},
    )


@pytest.fixture
def negotiation_protocol():
    """Create a NegotiationProtocol instance."""
    return NegotiationProtocol(
        protocol_id='test-negotiation-001',
        config={
            'max_turns': 10,
            'constraints': ['max_price=5000', 'min_availability=99.9'],
        },
    )


# ============================================================================
# Fixtures for validation
# ============================================================================

@pytest.fixture
def manifest_validator():
    """Create a ManifestValidator instance."""
    validator = ManifestValidator()
    # Force simulated mode for tests to ensure deterministic behavior
    validator.kya_validator = None
    return validator


@pytest.fixture
def valid_manifest_data() -> dict:
    """Create valid manifest data for testing."""
    return {
        'id': 'manifest-001',
        'version': '1.0',
        'type': 'service_manifest',
        'name': 'GPU Compute Service',
        'description': 'High-performance GPU compute service',
    }


@pytest.fixture
def invalid_manifest_data() -> dict:
    """Create invalid manifest data for testing."""
    return {
        'id': 'manifest-invalid',
        # Missing required fields: version, type
        'name': 'Invalid Manifest',
    }


@pytest.fixture
def policy_data() -> dict:
    """Create policy data for testing."""
    return {
        'id': 'policy-001',
        'version': '1.0',
        'constraints': [
            'min_availability=99.9',
            'max_price=5000',
            'region=us-east-1,us-west-2',
        ],
    }


# ============================================================================
# Fixtures for WebSocket testing
# ============================================================================

@pytest.fixture
def websocket_message() -> dict:
    """Create a sample WebSocket message."""
    return {
        'message_type': 'agent_message',
        'sender': 'user',
        'recipient': 'procurement_agent',
        'content': 'I need cloud infrastructure services.',
    }


@pytest.fixture
def heartbeat_message() -> dict:
    """Create a heartbeat WebSocket message."""
    return {
        'message_type': 'heartbeat',
    }


# ============================================================================
# Event loop fixtures for async tests
# ============================================================================

@pytest.fixture(scope='session')
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# Utility fixtures
# ============================================================================

@pytest.fixture
def current_timestamp() -> datetime:
    """Get the current timestamp."""
    return datetime.utcnow()
