"""
API tests for the FastAPI application.
"""
import pytest

from app.comms.schemas import (
    AgentMode,
    ClientType,
    ExchangeStatus,
)


@pytest.mark.integration
class TestAPIEndpoints:
    """Tests for FastAPI API endpoints."""

    @pytest.mark.asyncio
    async def test_root_endpoint(self, async_client):
        """Test the root endpoint."""
        response = await async_client.get('/')
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == 'KYA Validator Demo Backend'
        assert data['status'] == 'running'

    @pytest.mark.asyncio
    async def test_health_endpoint(self, async_client):
        """Test the health check endpoint."""
        response = await async_client.get('/health')
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'

    @pytest.mark.asyncio
    async def test_get_config(self, async_client):
        """Test getting configuration."""
        response = await async_client.get('/api/v1/config')
        assert response.status_code == 200
        data = response.json()
        assert 'agent_mode' in data
        assert 'demo_sector' in data
        assert 'llm_provider' in data
        assert 'default_model' in data

    @pytest.mark.asyncio
    async def test_start_session(self, async_client, session_start_data):
        """Test starting a new session."""
        response = await async_client.post(
            '/api/v1/session/start', json=session_start_data
        )
        assert response.status_code == 200
        data = response.json()
        assert 'session_id' in data
        assert data['agent_mode'] == 'simulated'
        assert data['client_type'] == 'flow_storefront'

    @pytest.mark.asyncio
    async def test_get_session(self, async_client, session_start_data):
        """Test getting a session."""
        # First create a session
        start_response = await async_client.post(
            '/api/v1/session/start', json=session_start_data
        )
        session_id = start_response.json()['session_id']

        # Then get it
        response = await async_client.get(f'/api/v1/session/{session_id}')
        assert response.status_code == 200
        data = response.json()
        assert data['session_id'] == session_id

    @pytest.mark.asyncio
    async def test_get_nonexistent_session(self, async_client):
        """Test getting a nonexistent session."""
        response = await async_client.get(
            '/api/v1/session/nonexistent-session'
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_end_session(self, async_client, session_start_data):
        """Test ending a session."""
        # First create a session
        start_response = await async_client.post(
            '/api/v1/session/start', json=session_start_data
        )
        session_id = start_response.json()['session_id']

        # Then end it - SessionEnd requires session_id
        response = await async_client.post(
            f'/api/v1/session/{session_id}/end',
            json={'session_id': session_id, 'reason': 'Test complete'},
        )
        assert response.status_code == 200
        data = response.json()
        assert data['session_id'] == session_id

    @pytest.mark.asyncio
    async def test_get_messages(self, async_client, session_start_data):
        """Test getting messages from a session."""
        # First create a session
        start_response = await async_client.post(
            '/api/v1/session/start', json=session_start_data
        )
        session_id = start_response.json()['session_id']

        # Get messages (should be empty)
        response = await async_client.get(
            f'/api/v1/session/{session_id}/messages'
        )
        assert response.status_code == 200
        data = response.json()
        assert 'messages' in data
        assert 'count' in data
        assert data['count'] == 0

    @pytest.mark.asyncio
    async def test_send_agent_message(self, async_client, session_start_data):
        """Test sending a message to an agent."""
        # First create a session
        start_response = await async_client.post(
            '/api/v1/session/start', json=session_start_data
        )
        session_id = start_response.json()['session_id']

        # Send a message
        message_data = {
            'sender': 'user',
            'recipient': 'procurement_agent',
            'content': 'I need GPU services.',
        }
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/message',
            json=message_data,
        )
        assert response.status_code == 200
        data = response.json()
        # New response format includes exchange_status and messages nested
        assert 'exchange_status' in data
        assert 'procurement_message' in data
        assert 'recipient_message' in data
        assert data['procurement_message']['sender'] == 'procurement_agent'
        assert 'content' in data['procurement_message']

    @pytest.mark.asyncio
    async def test_get_agent_thinking(self, async_client, session_start_data):
        """Test getting agent thinking."""
        # First create a session
        start_response = await async_client.post(
            '/api/v1/session/start', json=session_start_data
        )
        session_id = start_response.json()['session_id']

        # Get agent thinking
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/thinking',
        )
        assert response.status_code == 200
        data = response.json()
        assert 'reasoning' in data
        assert 'agent_id' in data
        assert 'confidence' in data

    @pytest.mark.asyncio
    async def test_validate_manifest(self, async_client, valid_manifest_data):
        """Test validating a manifest."""
        request_data = {'manifest_data': valid_manifest_data}
        response = await async_client.post(
            '/api/v1/validate/manifest', json=request_data
        )
        assert response.status_code == 200
        data = response.json()
        assert 'validation_status' in data
        assert 'manifest_id' in data

    @pytest.mark.asyncio
    async def test_workflow_transition(self, async_client):
        """Test workflow transition."""
        response = await async_client.post(
            '/api/v1/workflow/test-workflow/transition',
            params={'target_state': 'select_category'},
        )
        assert response.status_code == 200
        data = response.json()
        assert 'step_name' in data
        assert 'step_status' in data

    @pytest.mark.asyncio
    async def test_invalid_workflow_transition(self, async_client):
        """Test invalid workflow transition."""
        response = await async_client.post(
            '/api/v1/workflow/test-workflow/transition',
            params={'target_state': 'invalid_state'},
        )
        assert response.status_code == 400
        data = response.json()
        # FastAPI returns 'detail' key for HTTPException
        assert 'detail' in data


@pytest.mark.integration
class TestDualRoleAIConfiguration:
    """Tests for dual-role AI configuration and fallback behavior."""

    @pytest.mark.skip(reason="Requires GLM_API_KEY to be unset in settings")
    @pytest.mark.asyncio
    async def test_dual_llm_config_simulated_fallback(self, async_client, clean_state_store):
        """Test dual LLM config where agents fall back to simulated mode (no API keys)."""
        
        # Start session with both roles in LLM mode (but no API keys configured)
        session_start = {
            'session_id': 'test-dual-llm-fallback',
            'procurement_mode': 'llm',
            'recipient_mode': 'llm',
            'client_type': 'flow_storefront',
            'scenario_config': {'scenario_id': 'test_scenario'},
        }
    
        response = await async_client.post('/api/v1/session/start', json=session_start)
        assert response.status_code == 200
        data = response.json()
        assert data['procurement_mode'] == 'llm'
        assert data['recipient_mode'] == 'llm'
        session_id = data['session_id']
        
        # Send a message to trigger agent exchange
        message_data = {
            'sender': 'user',
            'recipient': 'procurement_agent',
            'content': 'I need GPU services.',
        }
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/message',
            json=message_data,
        )
        assert response.status_code == 200
        result = response.json()
        
        # Verify exchange status is DEGRADED (since LLM unavailable, fell back to simulated)
        assert result['exchange_status'] == ExchangeStatus.DEGRADED.value
        assert result['visible_reason'] is not None
        assert 'fell back to simulated mode' in result['visible_reason'].lower()
        
        # Verify provenance metadata exists
        assert 'exchange_metadata' in result
        metadata = result['exchange_metadata']
        assert 'procurement_provenance' in metadata
        assert 'recipient_provenance' in metadata
        
        # Check procurement provenance
        procurement_prov = metadata['procurement_provenance']
        assert procurement_prov['source'] == 'simulated'
        assert procurement_prov['agent_role'] == 'procurement'
        assert procurement_prov['fallback_reason'] == 'LLM unavailable - fell back to simulated mode'
        
        # Check recipient provenance
        recipient_prov = metadata['recipient_provenance']
        assert recipient_prov['source'] == 'simulated'
        assert recipient_prov['agent_role'] == 'recipient'
        assert recipient_prov['fallback_reason'] == 'LLM unavailable - fell back to simulated mode'
        
        # Verify messages contain generation_provenance
        assert 'generation_provenance' in result['procurement_message']
        assert 'generation_provenance' in result['recipient_message']

    @pytest.mark.asyncio
    async def test_dual_simulated_config_success(self, async_client, clean_state_store):
        """Test dual simulated config where both agents work as expected."""
        session_start = {
            'session_id': 'test-dual-simulated',
            'procurement_mode': 'simulated',
            'recipient_mode': 'simulated',
            'client_type': 'flow_storefront',
            'scenario_config': {'scenario_id': 'test_scenario'},
        }
        
        response = await async_client.post('/api/v1/session/start', json=session_start)
        assert response.status_code == 200
        data = response.json()
        assert data['procurement_mode'] == 'simulated'
        assert data['recipient_mode'] == 'simulated'
        session_id = data['session_id']
        
        # Send a message
        message_data = {
            'sender': 'user',
            'recipient': 'procurement_agent',
            'content': 'I need GPU services.',
        }
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/message',
            json=message_data,
        )
        assert response.status_code == 200
        result = response.json()
        
        # Verify exchange status is SUCCESS (both simulated as expected)
        assert result['exchange_status'] == ExchangeStatus.SUCCESS.value
        assert result['visible_reason'] is None
        
        # Verify provenance indicates simulated mode (no fallback)
        metadata = result['exchange_metadata']
        procurement_prov = metadata['procurement_provenance']
        recipient_prov = metadata['recipient_provenance']
        
        assert procurement_prov['source'] == 'simulated'
        assert 'fallback_reason' not in procurement_prov
        assert recipient_prov['source'] == 'simulated'
        assert 'fallback_reason' not in recipient_prov

    @pytest.mark.skip(reason="Requires GLM_API_KEY to be unset in settings")
    @pytest.mark.asyncio
    async def test_mixed_mode_config(self, async_client, clean_state_store):
        """Test mixed mode: procurement LLM, recipient simulated."""
        
        session_start = {
            'session_id': 'test-mixed-mode',
            'procurement_mode': 'llm',
            'recipient_mode': 'simulated',
            'client_type': 'flow_storefront',
            'scenario_config': {'scenario_id': 'test_scenario'},
        }
        
        response = await async_client.post('/api/v1/session/start', json=session_start)
        assert response.status_code == 200
        data = response.json()
        assert data['procurement_mode'] == 'llm'
        assert data['recipient_mode'] == 'simulated'
        session_id = data['session_id']
        
        # Send a message
        message_data = {
            'sender': 'user',
            'recipient': 'procurement_agent',
            'content': 'I need GPU services.',
        }
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/message',
            json=message_data,
        )
        assert response.status_code == 200
        result = response.json()
        
        # Verify exchange status is DEGRADED (one agent fell back)
        assert result['exchange_status'] == ExchangeStatus.DEGRADED.value
        assert result['visible_reason'] is not None
        assert 'procurement agent fell back' in result['visible_reason'].lower()
        
        # Verify provenance
        metadata = result['exchange_metadata']
        procurement_prov = metadata['procurement_provenance']
        recipient_prov = metadata['recipient_provenance']
        
        # Procurement should have fallback (LLM expected but simulated)
        assert procurement_prov['source'] == 'simulated'
        assert procurement_prov['fallback_reason'] == 'LLM unavailable - fell back to simulated mode'
        
        # Recipient should be simulated as expected (no fallback)
        assert recipient_prov['source'] == 'simulated'
        assert 'fallback_reason' not in recipient_prov

    @pytest.mark.asyncio
    async def test_backward_compatibility_legacy_agent_mode(self, async_client, clean_state_store):
        """Test backward compatibility: legacy agent_mode maps to both roles."""
        session_start = {
            'session_id': 'test-legacy-mode',
            'agent_mode': 'llm',  # Legacy field
            'client_type': 'flow_storefront',
            'scenario_config': {'scenario_id': 'test_scenario'},
        }
        
        response = await async_client.post('/api/v1/session/start', json=session_start)
        assert response.status_code == 200
        data = response.json()
        
        # Both roles should inherit the legacy agent_mode
        assert data['procurement_mode'] == 'llm'
        assert data['recipient_mode'] == 'llm'
        
        # Verify session works normally
        session_id = data['session_id']
        message_data = {
            'sender': 'user',
            'recipient': 'procurement_agent',
            'content': 'Test message',
        }
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/message',
            json=message_data,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_session_mode_backward_compat(self, async_client, clean_state_store):
        """Test that updating session mode via legacy endpoint affects both roles."""
        # Start with dual-mode configuration
        session_start = {
            'session_id': 'test-mode-update',
            'procurement_mode': 'llm',
            'recipient_mode': 'simulated',
            'client_type': 'flow_storefront',
        }
        response = await async_client.post('/api/v1/session/start', json=session_start)
        session_id = response.json()['session_id']
        
        # Update mode via legacy endpoint (should affect both roles)
        # Frontend sends mode as plain JSON string, not object
        response = await async_client.put(
            f'/api/v1/session/{session_id}/mode',
            json='simulated'
        )
        assert response.status_code == 200
        data = response.json()
        
        # Both roles should now be simulated
        assert data['procurement_mode'] == 'simulated'
        assert data['recipient_mode'] == 'simulated'

    @pytest.mark.skip(reason="Requires GLM_API_KEY to be unset in settings")
    @pytest.mark.asyncio
    async def test_exchange_status_both_fallback_returns_degraded(self, async_client, clean_state_store):
        """Test DEGRADED status when both agents expected LLM but fell back to simulated."""
        
        session_start = {
            'session_id': 'test-fallback-exchange',
            'procurement_mode': 'llm',
            'recipient_mode': 'llm',
            'client_type': 'flow_storefront',
            'scenario_config': {'scenario_id': 'test_scenario'},
        }
        
        response = await async_client.post('/api/v1/session/start', json=session_start)
        session_id = response.json()['session_id']
        
        message_data = {
            'sender': 'user',
            'recipient': 'procurement_agent',
            'content': 'Test',
        }
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/message',
            json=message_data,
        )
        result = response.json()
        
        # Both agents fell back -> DEGRADED (not FAILED)
        assert result['exchange_status'] == ExchangeStatus.DEGRADED.value
        assert 'procurement agent fell back' in result['visible_reason'].lower()
        assert 'recipient agent fell back' in result['visible_reason'].lower()

    @pytest.mark.asyncio
    async def test_provenance_in_message_payloads(self, async_client, clean_state_store):
        """Test that individual messages include generation_provenance."""
        session_start = {
            'session_id': 'test-provenance',
            'procurement_mode': 'llm',
            'recipient_mode': 'simulated',
            'client_type': 'flow_storefront',
        }
        response = await async_client.post('/api/v1/session/start', json=session_start)
        session_id = response.json()['session_id']
        
        message_data = {
            'sender': 'user',
            'recipient': 'procurement_agent',
            'content': 'Test',
        }
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/message',
            json=message_data,
        )
        result = response.json()
        
        # Check procurement message has provenance
        procurement_msg = result['procurement_message']
        assert 'generation_provenance' in procurement_msg
        prov = procurement_msg['generation_provenance']
        assert 'source' in prov
        assert 'agent_role' in prov
        assert prov['agent_role'] == 'procurement'
        
        # Check recipient message has provenance
        recipient_msg = result['recipient_message']
        assert 'generation_provenance' in recipient_msg
        prov = recipient_msg['generation_provenance']
        assert 'source' in prov
        assert 'agent_role' in prov
        assert prov['agent_role'] == 'recipient'


@pytest.mark.integration
class TestWebSocketIntegration:
    """Tests for WebSocket integration."""

    @pytest.mark.asyncio
    async def test_websocket_session_flow(self, async_client, session_start_data):
        """Test WebSocket session flow."""
        # First create a session
        start_response = await async_client.post(
            '/api/v1/session/start', json=session_start_data
        )
        session_id = start_response.json()['session_id']

        # Send agent message via REST to trigger exchange
        message_data = {
            'sender': 'user',
            'recipient': 'procurement_agent',
            'content': 'I need GPU services.',
        }
        response = await async_client.post(
            f'/api/v1/session/{session_id}/agent/message',
            json=message_data,
        )
        result = response.json()
        # Verify new response format
        assert 'exchange_status' in result
        assert 'procurement_message' in result
        assert 'recipient_message' in result
        assert result['procurement_message']['sender'] == 'procurement_agent'
        assert 'content' in result['procurement_message']
