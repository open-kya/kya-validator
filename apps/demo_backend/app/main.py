"""
Main FastAPI application for KYA Validator Demo Backend.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import json
from typing import Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

from loguru import logger

from .settings import settings
from .comms.schemas import *
from .comms.state_store import state_store
from .agents.agent_interfaces import AgentFactory
from .agents.agent_to_validator import AgentToValidator
from .workflows.flow_storefront import FlowStorefront
from .workflows.doc_storefront import DocStorefront
from .workflows.negotiation_protocol import NegotiationProtocol
from .validation.manifest_validator import ManifestValidator
from .prompts import get_prompt_manager

# Import AgentMode for type checking
from .comms.schemas import AgentMode

# Configure loguru
logger.remove()  # Remove default handler
logger.add(
    sink=lambda msg: print(msg, end=''),
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Agent mode: {settings.default_agent_mode}")
    logger.info(f"Demo sector: {settings.demo_sector}")

    yield

    # Shutdown
    logger.info("Shutting down...")


# Pydantic models for prompt API
class PromptUpdate(BaseModel):
    """Request model for updating a prompt."""
    name: str
    description: str
    agentType: str
    systemPrompt: str
    parameters: Dict[str, Any]
    responseTemplates: Dict[str, List[str]]
    version: str = "1.0.0"
    stages: Dict[str, Dict[str, str]] = {}

class PromptResponse(BaseModel):
    """Response model for prompt data."""
    name: str
    description: str
    agentType: str
    systemPrompt: str
    parameters: Dict[str, Any]
    responseTemplates: Dict[str, List[str]]
    version: str
    stages: Dict[str, Dict[str, str]] = {}

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Initialize components
manifest_validator = ManifestValidator()
agent_to_validator = AgentToValidator()
prompt_manager = get_prompt_manager()


@app.get('/')
async def root():
    """Root endpoint."""
    return {
        'name': settings.app_name,
        'version': settings.app_version,
        'status': 'running',
    }


@app.get('/health')
async def health():
    """Health check endpoint."""
    return {'status': 'healthy'}


@app.get('/api/v1/config')
async def get_config():
    """Get demo configuration."""
    return {
        'agent_mode': settings.default_agent_mode,
        'demo_sector': settings.demo_sector,
        'llm_provider': settings.default_llm_provider,
        'default_model': settings.default_model,
    }


@app.post('/api/v1/session/start')
async def start_session(session_start: SessionStart):
    """Start a new demo session."""
    # Handle backward compatibility: if only legacy agent_mode is provided, map to both roles
    if session_start.procurement_mode is None and session_start.recipient_mode is None:
        # Use legacy agent_mode for both roles
        procurement_mode = session_start.agent_mode or AgentMode.LLM
        recipient_mode = session_start.agent_mode or AgentMode.LLM
    else:
        # Use role-specific modes
        procurement_mode = session_start.procurement_mode or AgentMode.LLM
        recipient_mode = session_start.recipient_mode or AgentMode.LLM
    
    # Create modified session_start with resolved modes for state store
    modified_session_start = SessionStart(
        session_id=session_start.session_id,
        procurement_mode=procurement_mode,
        recipient_mode=recipient_mode,
        client_type=session_start.client_type,
        scenario_config=session_start.scenario_config,
    )
    
    session = await state_store.create_session(
        session_id=session_start.session_id,
        session_start=modified_session_start,
    )

    logger.info(
        f"Started session {session_start.session_id} "
        f"with procurement_mode={procurement_mode.value}, recipient_mode={recipient_mode.value} "
        f"and client type {session_start.client_type}"
    )

    return {
        'session_id': session.session_id,
        'agent_mode': session.agent_mode.value,  # Legacy field for backward compatibility
        'procurement_mode': session.procurement_mode.value,
        'recipient_mode': session.recipient_mode.value,
        'client_type': session.client_type.value,
        'created_at': session.created_at.isoformat(),
    }


@app.get('/api/v1/session/{session_id}')
async def get_session(session_id: str):
    """Get session information."""
    session = await state_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    return session.to_dict()


@app.post('/api/v1/session/{session_id}/end')
async def end_session(session_id: str, session_end: SessionEnd):
    """End a demo session."""
    session = await state_store.end_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    logger.info(f"Ended session {session_id}")

    return session.to_dict()


@app.put('/api/v1/session/{session_id}/mode')
async def update_session_mode(
    session_id: str,
    mode: AgentMode = Body(..., media_type='application/json')
):
    """Update the agent mode for an active session (legacy - applies to both roles).
    
    Expects a JSON body with the mode as a plain string (e.g., "simulated" or "llm").
    """
    session = await state_store.update_session(session_id, procurement_mode=mode, recipient_mode=mode)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    logger.info(f"Updated session {session_id} mode to {mode.value} for both roles")

    # Broadcast mode change via WebSocket
    await state_store.broadcast_message(session_id, {
        'message_type': 'mode_change',
        'agent_mode': mode.value,  # Legacy field for backward compatibility
        'procurement_mode': mode.value,
        'recipient_mode': mode.value,
    })

    return session.to_dict()


# Alternative endpoint that accepts JSON body (for clients that prefer JSON)
@app.put('/api/v1/session/{session_id}/mode/json')
async def update_session_mode_json(session_id: str, mode: AgentMode):
    """Update the agent mode for an active session (JSON body version)."""
    return await update_session_mode(session_id, mode)


@app.get('/api/v1/session/{session_id}/messages')
async def get_messages(session_id: str):
    """Get all messages for a session."""
    messages = await state_store.get_messages(session_id)
    return {
        'session_id': session_id,
        'messages': [msg.dict() for msg in messages],
        'count': len(messages),
    }


@app.get('/api/v1/session/{session_id}/negotiation')
async def get_negotiation_history(session_id: str):
    """Get negotiation history for a session."""
    history = await state_store.get_negotiation_history(session_id)
    return {
        'session_id': session_id,
        'negotiation_history': history,
        'count': len(history),
    }


@app.post('/api/v1/session/{session_id}/agent/message')
async def send_agent_message(session_id: str, message: AgentMessage):
    """Send a message to an agent and get a response with explicit exchange status."""
    session = await state_store.get_session(session_id)
    if not session:
        logger.error(f"Session {session_id} not found!")
        raise HTTPException(status_code=404, detail='Session not found')

    logger.info(f"Processing message from {message.sender} in session {session_id}")

    # Add incoming message to session
    await state_store.add_message(session_id, message)

    # Create both agents with role-specific modes
    procurement_agent = AgentFactory.create_procurement_agent(
        mode=session.procurement_mode,
        config={'scenario_id': session.scenario_config.get('scenario_id', 'default')},
    )

    recipient_agent = AgentFactory.create_recipient_agent(
        mode=session.recipient_mode,
        config={'scenario_id': session.scenario_config.get('scenario_id', 'default')},
    )

    # Process message with procurement agent
    procurement_response = await procurement_agent.process_message(message)
    
    # Add provenance metadata to procurement response
    procurement_provenance = {
        'source': 'llm' if procurement_agent.get_mode() == AgentMode.LLM else 'simulated',
        'agent_role': 'procurement',
        'provider': getattr(procurement_agent, 'llm_provider', None) if hasattr(procurement_agent, 'llm_provider') else None,
    }
    
    # Check if procurement fell back to simulated (when LLM was expected but not available)
    procurement_expected_ai = (session.procurement_mode == AgentMode.LLM)
    procurement_actual_ai = (procurement_agent.get_mode() == AgentMode.LLM)
    procurement_fallback = procurement_expected_ai and not procurement_actual_ai
    
    if procurement_fallback:
        procurement_provenance['fallback_reason'] = 'LLM unavailable - fell back to simulated mode'
    
    # Attach provenance to response metadata
    procurement_response_dict = procurement_response.dict()
    procurement_response_dict['generation_provenance'] = procurement_provenance

    # Add procurement response to session
    await state_store.add_message(session_id, procurement_response)

    # Process procurement response with recipient agent (two-agent conversation)
    recipient_response = await recipient_agent.process_message(procurement_response)
    
    # Add provenance metadata to recipient response
    recipient_provenance = {
        'source': 'llm' if recipient_agent.get_mode() == AgentMode.LLM else 'simulated',
        'agent_role': 'recipient',
        'provider': getattr(recipient_agent, 'llm_provider', None) if hasattr(recipient_agent, 'llm_provider') else None,
    }
    
    # Check if recipient fell back to simulated (when LLM was expected but not available)
    recipient_expected_ai = (session.recipient_mode == AgentMode.LLM)
    recipient_actual_ai = (recipient_agent.get_mode() == AgentMode.LLM)
    recipient_fallback = recipient_expected_ai and not recipient_actual_ai
    
    if recipient_fallback:
        recipient_provenance['fallback_reason'] = 'LLM unavailable - fell back to simulated mode'
    
    # Attach provenance to response metadata
    recipient_response_dict = recipient_response.dict()
    recipient_response_dict['generation_provenance'] = recipient_provenance

    # Add recipient response to session
    await state_store.add_message(session_id, recipient_response)

    # Determine exchange-level status
    exchange_status = ExchangeStatus.SUCCESS
    visible_reason = None
    
    if procurement_fallback or recipient_fallback:
        exchange_status = ExchangeStatus.DEGRADED
        reasons = []
        if procurement_fallback:
            reasons.append("Procurement agent fell back to simulated mode")
        if recipient_fallback:
            reasons.append("Recipient agent fell back to simulated mode")
        visible_reason = "; ".join(reasons)
    
    # FAILED status is reserved for actual errors/exceptions, not just fallback
    # (kept for future extension if needed)

    # Create negotiation entry for the exchange with provenance
    negotiation_entry = {
        'type': 'message_exchange',
        'turn': len(session.messages) // 2,
        'procurement_message': procurement_response_dict,
        'recipient_message': recipient_response_dict,
        'timestamp': datetime.utcnow().isoformat(),
        'exchange_status': exchange_status.value,
        'visible_reason': visible_reason,
        'exchange_metadata': {
            'procurement_provenance': procurement_provenance,
            'recipient_provenance': recipient_provenance,
            'procurement_expected_ai': procurement_expected_ai,
            'recipient_expected_ai': recipient_expected_ai,
        }
    }
    await state_store.add_negotiation_entry(session_id, negotiation_entry)

    # Broadcast both messages via WebSocket
    await state_store.broadcast_message(session_id, {
        'message_type': 'agent_exchange',
        'procurement_message': procurement_response_dict,
        'recipient_message': recipient_response_dict,
        'exchange_status': exchange_status.value,
        'visible_reason': visible_reason,
    })

    logger.info(f"Generated responses: procurement from {procurement_response.sender} (mode={procurement_agent.get_mode()}), recipient from {recipient_response.sender} (mode={recipient_agent.get_mode()})")

    # Return structured response with exchange status
    return {
        'exchange_status': exchange_status.value,
        'visible_reason': visible_reason,
        'incoming_message': message.dict(),
        'procurement_message': procurement_response_dict,
        'recipient_message': recipient_response_dict,
        'exchange_metadata': negotiation_entry['exchange_metadata'],
    }


@app.post('/api/v1/session/{session_id}/agent/thinking')
async def get_agent_thinking(session_id: str):
    """Get the current thinking state of the agent."""
    session = await state_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    agent = AgentFactory.create_procurement_agent(
        mode=session.procurement_mode,
        config={'scenario_id': session.scenario_config.get('scenario_id', 'default')},
    )

    thinking = await agent.get_thinking()
    return thinking.dict()


@app.post('/api/v1/validate/manifest')
async def validate_manifest(request: ValidationRequest):
    """Validate a manifest."""
    result = await manifest_validator.validate(request.manifest_data)
    return result.dict()


@app.post('/api/v1/workflow/{workflow_id}/transition')
async def workflow_transition(workflow_id: str, target_state: str):
    """Transition a workflow to a new state."""
    # Extract session_id from workflow_id (format is 'workflow-{session_id}')
    session_id = workflow_id.replace('workflow-', '') if workflow_id.startswith('workflow-') else workflow_id
    
    # This is a simplified version - in production would look up workflow type
    workflow = FlowStorefront(workflow_id=workflow_id)

    from .workflows.flow_storefront import FlowState

    try:
        target = FlowState(target_state)
        step = await workflow.transition_to(target)
        
        # Broadcast workflow step via WebSocket
        await state_store.broadcast_message(session_id, step.dict())
        
        return step.dict()
    except ValueError:
        raise HTTPException(status_code=400, detail=f'Invalid state: {target_state}')


@app.websocket('/ws/{session_id}')
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time communication."""
    await websocket.accept()

    # Register websocket
    await state_store.register_websocket(session_id, websocket)

    logger.info(f"WebSocket connected for session {session_id}")

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)

            # Process message based on type
            if message.get('message_type') == 'agent_message':
                agent_message = AgentMessage(**message)
                logger.info(f"WebSocket received agent_message from {agent_message.sender}")
                await state_store.add_message(session_id, agent_message)

                # Get session
                session = await state_store.get_session(session_id)
                if session:
                    # Create both agents with role-specific modes
                    procurement_agent = AgentFactory.create_procurement_agent(
                        mode=session.procurement_mode,
                        config={'scenario_id': session.scenario_config.get('scenario_id', 'default')},
                    )

                    recipient_agent = AgentFactory.create_recipient_agent(
                        mode=session.recipient_mode,
                        config={'scenario_id': session.scenario_config.get('scenario_id', 'default')},
                    )

                    # Process message with procurement agent
                    procurement_response = await procurement_agent.process_message(agent_message)
                    
                    # Add provenance metadata to procurement response
                    procurement_provenance = {
                        'source': 'llm' if procurement_agent.get_mode() == AgentMode.LLM else 'simulated',
                        'agent_role': 'procurement',
                        'provider': getattr(procurement_agent, 'llm_provider', None) if hasattr(procurement_agent, 'llm_provider') else None,
                    }
                    
                    # Check if procurement fell back to simulated
                    procurement_expected_ai = (session.procurement_mode == AgentMode.LLM)
                    procurement_actual_ai = (procurement_agent.get_mode() == AgentMode.LLM)
                    procurement_fallback = procurement_expected_ai and not procurement_actual_ai
                    
                    if procurement_fallback:
                        procurement_provenance['fallback_reason'] = 'LLM unavailable - fell back to simulated mode'
                    
                    procurement_response_dict = procurement_response.dict()
                    procurement_response_dict['generation_provenance'] = procurement_provenance

                    # Add procurement response to session
                    await state_store.add_message(session_id, procurement_response)

                    # Process procurement response with recipient agent
                    recipient_response = await recipient_agent.process_message(procurement_response)
                    
                    # Add provenance metadata to recipient response
                    recipient_provenance = {
                        'source': 'llm' if recipient_agent.get_mode() == AgentMode.LLM else 'simulated',
                        'agent_role': 'recipient',
                        'provider': getattr(recipient_agent, 'llm_provider', None) if hasattr(recipient_agent, 'llm_provider') else None,
                    }
                    
                    # Check if recipient fell back to simulated
                    recipient_expected_ai = (session.recipient_mode == AgentMode.LLM)
                    recipient_actual_ai = (recipient_agent.get_mode() == AgentMode.LLM)
                    recipient_fallback = recipient_expected_ai and not recipient_actual_ai
                    
                    if recipient_fallback:
                        recipient_provenance['fallback_reason'] = 'LLM unavailable - fell back to simulated mode'
                    
                    recipient_response_dict = recipient_response.dict()
                    recipient_response_dict['generation_provenance'] = recipient_provenance

                    # Add recipient response to session
                    await state_store.add_message(session_id, recipient_response)

                    # Determine exchange-level status
                    exchange_status = ExchangeStatus.SUCCESS
                    visible_reason = None
                    
                    if procurement_fallback or recipient_fallback:
                        exchange_status = ExchangeStatus.DEGRADED
                        reasons = []
                        if procurement_fallback:
                            reasons.append("Procurement agent fell back to simulated mode")
                        if recipient_fallback:
                            reasons.append("Recipient agent fell back to simulated mode")
                        visible_reason = "; ".join(reasons)
                    
                    if (procurement_expected_ai and not procurement_actual_ai and
                        recipient_expected_ai and not recipient_actual_ai):
                        exchange_status = ExchangeStatus.FAILED
                        visible_reason = "Both agents unavailable for AI generation - all outputs simulated"

                    # Create negotiation entry for the exchange with provenance
                    negotiation_entry = {
                        'type': 'message_exchange',
                        'turn': len(session.messages) // 2,
                        'procurement_message': procurement_response_dict,
                        'recipient_message': recipient_response_dict,
                        'timestamp': datetime.utcnow().isoformat(),
                        'exchange_status': exchange_status.value,
                        'visible_reason': visible_reason,
                        'exchange_metadata': {
                            'procurement_provenance': procurement_provenance,
                            'recipient_provenance': recipient_provenance,
                            'procurement_expected_ai': procurement_expected_ai,
                            'recipient_expected_ai': recipient_expected_ai,
                        }
                    }
                    await state_store.add_negotiation_entry(session_id, negotiation_entry)

                    # Send both messages back with exchange status
                    response = {
                        'message_type': 'agent_exchange',
                        'incoming_message': agent_message.dict(),
                        'procurement_message': procurement_response_dict,
                        'recipient_message': recipient_response_dict,
                        'exchange_status': exchange_status.value,
                        'visible_reason': visible_reason,
                    }
                    await websocket.send_json(response)

            elif message.get('message_type') == 'heartbeat':
                # Respond to heartbeat
                await websocket.send_json({'message_type': 'heartbeat_ack'})

            else:
                # Echo back unknown messages
                await websocket.send_json(message)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
    finally:
        # Unregister websocket
        await state_store.unregister_websocket(session_id)


# Prompt API endpoints
@app.get('/api/v1/prompts/{agent_type}')
async def get_prompts(agent_type: str):
    """Get all prompts for an agent type."""
    # Map agent_type to file name
    agent_file_map = {
        'procurement': 'procurement_agent',
        'recipient': 'recipient_agent',
    }
    
    file_name = agent_file_map.get(agent_type)
    if not file_name:
        raise HTTPException(
            status_code=400,
            detail=f'Invalid agent type: {agent_type}. Must be "procurement" or "recipient"'
        )
    
    # Load prompts from YAML file
    prompts = prompt_manager._load_yaml_file(
        prompt_manager._get_prompt_file_path(file_name)
    )
    
    if not prompts:
        return {'prompts': []}
    
    # Convert to list of prompt configs
    prompt_list = []
    
    # Add system prompt as a config
    if 'system_prompt' in prompts:
        prompt_list.append(PromptResponse(
            name='system',
            description='Main system prompt',
            agentType=agent_type,
            systemPrompt=prompts['system_prompt'],
            parameters=prompts.get('parameters', {}),
            responseTemplates={},
            version='1.0.0',
        ))
    
    # Add stage prompts
    if 'stages' in prompts:
        for stage_name, stage_data in prompts['stages'].items():
            template = stage_data if isinstance(stage_data, str) else stage_data.get('template', '')
            prompt_list.append(PromptResponse(
                name=stage_name,
                description=f'Prompt for {stage_name} stage',
                agentType=agent_type,
                systemPrompt=template,
                parameters={},
                responseTemplates={},
                version='1.0.0',
            ))
    
    return {'prompts': prompt_list}


@app.get('/api/v1/prompts/{agent_type}/{prompt_name}')
async def get_prompt(agent_type: str, prompt_name: str):
    """Get a specific prompt by name."""
    agent_file_map = {
        'procurement': 'procurement_agent',
        'recipient': 'recipient_agent',
    }
    
    file_name = agent_file_map.get(agent_type)
    if not file_name:
        raise HTTPException(
            status_code=400,
            detail=f'Invalid agent type: {agent_type}'
        )
    
    prompts = prompt_manager._load_yaml_file(
        prompt_manager._get_prompt_file_path(file_name)
    )
    
    if not prompts:
        raise HTTPException(
            status_code=404,
            detail=f'Prompt file not found for agent type: {agent_type}'
        )
    
    # Find the specific prompt
    if prompt_name == 'system':
        if 'system_prompt' in prompts:
            return PromptResponse(
                name='system',
                description='Main system prompt',
                agentType=agent_type,
                systemPrompt=prompts['system_prompt'],
                parameters=prompts.get('parameters', {}),
                responseTemplates={},
                version='1.0.0',
            )
    elif 'stages' in prompts and prompt_name in prompts['stages']:
        stage_data = prompts['stages'][prompt_name]
        template = stage_data if isinstance(stage_data, str) else stage_data.get('template', '')
        return PromptResponse(
            name=prompt_name,
            description=f'Prompt for {prompt_name} stage',
            agentType=agent_type,
            systemPrompt=template,
            parameters={},
            responseTemplates={},
            version='1.0.0',
        )
    else:
        raise HTTPException(
            status_code=404,
            detail=f'Prompt not found: {prompt_name}'
        )


@app.put('/api/v1/prompts/{agent_type}/{prompt_name}')
async def update_prompt(agent_type: str, prompt_name: str, update: PromptUpdate):
    """Update a prompt."""
    agent_file_map = {
        'procurement': 'procurement_agent',
        'recipient': 'recipient_agent',
    }
    
    file_name = agent_file_map.get(agent_type)
    if not file_name:
        raise HTTPException(
            status_code=400,
            detail=f'Invalid agent type: {agent_type}'
        )
    
    file_path = prompt_manager._get_prompt_file_path(file_name)
    
    # Load existing prompts
    prompts = prompt_manager._load_yaml_file(file_path)
    
    if not prompts:
        # Create new file if it doesn't exist
        prompts = {
            'system_prompt': update.systemPrompt,
            'parameters': update.parameters,
            'stages': update.stages,
        }
    else:
        # Update existing prompts
        if prompt_name == 'system':
            prompts['system_prompt'] = update.systemPrompt
            if update.parameters:
                prompts['parameters'] = update.parameters
        elif 'stages' in prompts and prompt_name in prompts['stages']:
            template = update.systemPrompt
            prompts['stages'][prompt_name] = {'template': template}
        else:
            raise HTTPException(
                status_code=404,
                detail=f'Prompt not found: {prompt_name}'
            )
    
    # Write back to file
    try:
        import yaml
        with open(file_path, 'w', encoding='utf-8') as f:
            yaml.safe_dump(prompts, f, default_flow_style=False, sort_keys=False)
        
        # Clear cache
        prompt_manager.reload(file_name)
        
        logger.info(f'Updated prompt {prompt_name} for agent {agent_type}')
        
        return PromptResponse(
            name=prompt_name,
            description=update.description,
            agentType=update.agentType,
            systemPrompt=update.systemPrompt,
            parameters=update.parameters,
            responseTemplates=update.responseTemplates,
            version=update.version,
            stages=update.stages,
        )
    except Exception as e:
        logger.error(f'Failed to update prompt file: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to update prompt: {str(e)}'
        )


# Scenario API endpoints
class ScenarioConfig(BaseModel):
    """Scenario configuration model."""
    session_id: str
    scenario_type: str
    parameters: Dict[str, Any]

@app.post('/api/v1/scenario/select')
async def select_scenario(scenario_config: ScenarioConfig):
    """Select and apply a negotiation scenario."""
    session_id = scenario_config.session_id
    scenario_type = scenario_config.scenario_type
    parameters = scenario_config.parameters

    # Store scenario in session config
    await state_store.set_scenario_config(session_id, scenario_type, parameters)

    logger.info(f"Scenario {scenario_type} selected for session {session_id}")

    return {
        'session_id': session_id,
        'scenario_type': scenario_type,
        'parameters': parameters,
    }


# Agent-to Validation API endpoints
class AgentToValidationRequest(BaseModel):
    """Request model for agent-to validation."""
    nonce: str
    encrypted_response: str
    manifest_id: str


@app.post('/api/v1/agent-to/validate')
async def validate_agent_to(request: AgentToValidationRequest):
    """Validate agent-to encryption.

    Args:
        request: Contains nonce, encrypted_response, and manifest_id

    Returns:
        Validation result with valid flag and details
    """
    # For demo purposes, create a mock manifest
    mock_manifest = {
        'id': request.manifest_id,
        'public_key': 'demo_public_key_for_testing',
    }

    # Validate the encrypted response
    result = agent_to_validator.validate_agent_to(
        request.nonce,
        request.encrypted_response,
        mock_manifest,
    )

    logger.info(
        f'Agent-to validation for manifest {request.manifest_id}: '
        f'valid={result["valid"]}'
    )

    return result

@app.get('/api/v1/scenario/current')
async def get_current_scenario(session_id: str):
    """Get the current scenario for a session."""
    scenario = await state_store.get_scenario_config(session_id)

    if not scenario:
        return {
            'session_id': session_id,
            'scenario_type': None,
            'parameters': {},
        }

    return {
        'session_id': session_id,
        'scenario_type': scenario['scenario_type'],
        'parameters': scenario['parameters'],
    }

if __name__ == '__main__':
    import uvicorn

    uvicorn.run(
        'app.main:app',
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
    )
