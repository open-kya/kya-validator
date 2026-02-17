"""
Type A: Flow-Based Store Front (State Machine).
"""
from enum import Enum
from typing import Dict, Any, Optional, List
import asyncio

from ..comms.schemas import (
    WorkflowState,
    WorkflowStep,
    ValidationContext,
    ValidationStatus,
    MessageType,
)


class FlowState(str, Enum):
    """States for the flow-based storefront."""
    LANDING = 'landing'
    SELECT_CATEGORY = 'select_category'
    SELECT_SKU = 'select_sku'
    POLICY_CHECK = 'policy_check'
    MANIFEST_CHECK = 'manifest_check'
    QUOTE = 'quote'
    CONFIRM_ORDER = 'confirm_order'
    ERROR = 'error'
    COMPLETE = 'complete'


class FlowStorefront:
    """
    Type A: Flow-Based Store Front.
    Deterministic state machine resembling a phone IVR.
    """

    # State transition definitions
    TRANSITIONS = {
        FlowState.LANDING: [FlowState.SELECT_CATEGORY],
        FlowState.SELECT_CATEGORY: [FlowState.SELECT_SKU],
        FlowState.SELECT_SKU: [FlowState.POLICY_CHECK],
        FlowState.POLICY_CHECK: [FlowState.MANIFEST_CHECK, FlowState.ERROR],
        FlowState.MANIFEST_CHECK: [FlowState.QUOTE, FlowState.ERROR],
        FlowState.QUOTE: [FlowState.CONFIRM_ORDER],
        FlowState.CONFIRM_ORDER: [FlowState.COMPLETE],
        FlowState.ERROR: [FlowState.SELECT_CATEGORY],
    }

    def __init__(self, workflow_id: str, config: Optional[Dict[str, Any]] = None):
        self.workflow_id = workflow_id
        self.config = config or {}
        self.current_state = FlowState.LANDING
        self.context: Dict[str, Any] = {}
        self.history: List[Dict[str, Any]] = []

    async def get_state(self) -> WorkflowState:
        """Get the current workflow state."""
        return WorkflowState(
            workflow_id=self.workflow_id,
            current_state=self.current_state.value,
            available_transitions=[s.value for s in self.TRANSITIONS.get(self.current_state, [])],
            context=self.context.copy(),
        )

    async def transition_to(self, new_state: FlowState) -> WorkflowStep:
        """Transition to a new state."""
        valid_transitions = self.TRANSITIONS.get(self.current_state, [])

        if new_state not in valid_transitions:
            return WorkflowStep(
                workflow_id=self.workflow_id,
                step_name=f'transition_{self.current_state.value}_to_{new_state.value}',
                step_status='failed',
                error=f'Invalid transition from {self.current_state.value} to {new_state.value}',
            )

        # Record history
        self.history.append({
            'from_state': self.current_state.value,
            'to_state': new_state.value,
            'timestamp': str(asyncio.get_event_loop().time()),
        })

        # Execute state-specific logic
        result = await self._execute_state_logic(new_state)

        if result.get('error'):
            self.current_state = FlowState.ERROR
            return WorkflowStep(
                workflow_id=self.workflow_id,
                step_name=new_state.value,
                step_status='failed',
                error=result['error'],
            )

        self.current_state = new_state
        self.context.update(result.get('context', {}))

        return WorkflowStep(
            workflow_id=self.workflow_id,
            step_name=new_state.value,
            step_status='completed',
            result=result,
        )

    async def _execute_state_logic(self, state: FlowState) -> Dict[str, Any]:
        """Execute the logic for a specific state."""
        if state == FlowState.SELECT_CATEGORY:
            return await self._handle_select_category()
        elif state == FlowState.SELECT_SKU:
            return await self._handle_select_sku()
        elif state == FlowState.POLICY_CHECK:
            return await self._handle_policy_check()
        elif state == FlowState.MANIFEST_CHECK:
            return await self._handle_manifest_check()
        elif state == FlowState.QUOTE:
            return await self._handle_quote()
        elif state == FlowState.CONFIRM_ORDER:
            return await self._handle_confirm_order()
        elif state == FlowState.COMPLETE:
            return await self._handle_complete()
        else:
            return {'context': {}}

    async def _handle_select_category(self) -> Dict[str, Any]:
        """Handle category selection."""
        categories = [
            'compute_gpu',
            'inference_services',
            'data_pipelines',
            'storage_solutions',
        ]
        return {
            'context': {
                'available_categories': categories,
                'selected_category': categories[0],
            }
        }

    async def _handle_select_sku(self) -> Dict[str, Any]:
        """Handle SKU selection."""
        category = self.context.get('selected_category', 'compute_gpu')

        skus = {
            'compute_gpu': ['a100-80gb', 'h100-80gb', 'l4-24gb'],
            'inference_services': ['gpt-4-turbo', 'claude-3', 'llama-2-70b'],
            'data_pipelines': ['etl-basic', 'streaming-realtime', 'batch-processing'],
            'storage_solutions': ['hot-storage', 'cold-storage', 'archive'],
        }

        available = skus.get(category, [])
        return {
            'context': {
                'available_skus': available,
                'selected_sku': available[0] if available else None,
            }
        }

    async def _handle_policy_check(self) -> Dict[str, Any]:
        """Handle policy validation."""
        # Simulate policy check
        await asyncio.sleep(0.5)

        # In production, this would call KYA Validator
        is_valid = True  # Simulated

        if not is_valid:
            return {
                'error': 'Policy validation failed: Non-compliant region',
                'context': {'policy_valid': False},
            }

        return {
            'context': {
                'policy_valid': True,
                'policy_id': 'policy-001',
            }
        }

    async def _handle_manifest_check(self) -> Dict[str, Any]:
        """Handle manifest validation."""
        await asyncio.sleep(0.5)

        # Simulate manifest check
        is_valid = True  # Simulated

        if not is_valid:
            return {
                'error': 'Manifest validation failed: Missing TEE evidence',
                'context': {'manifest_valid': False},
            }

        return {
            'context': {
                'manifest_valid': True,
                'manifest_id': 'manifest-001',
                'mcp_validated': True,
                'tee_validated': True,
            }
        }

    async def _handle_quote(self) -> Dict[str, Any]:
        """Handle quote generation."""
        sku = self.context.get('selected_sku', 'a100-80gb')

        prices = {
            'a100-80gb': 2500,
            'h100-80gb': 3500,
            'l4-24gb': 800,
            'gpt-4-turbo': 1200,
            'claude-3': 1000,
            'llama-2-70b': 600,
            'etl-basic': 500,
            'streaming-realtime': 1500,
            'batch-processing': 400,
            'hot-storage': 200,
            'cold-storage': 50,
            'archive': 20,
        }

        price = prices.get(sku, 1000)

        return {
            'context': {
                'quote_price': price,
                'quote_currency': 'USD',
                'quote_duration': '12 months',
            }
        }

    async def _handle_confirm_order(self) -> Dict[str, Any]:
        """Handle order confirmation."""
        return {
            'context': {
                'order_confirmed': True,
                'order_id': f'ORD-{asyncio.get_event_loop().time():.0f}',
            }
        }

    async def _handle_complete(self) -> Dict[str, Any]:
        """Handle completion."""
        return {
            'context': {
                'workflow_complete': True,
                'final_state': 'success',
            }
        }

    def get_validation_context(self) -> ValidationContext:
        """Get the current validation context."""
        return ValidationContext(
            manifest_id=self.context.get('manifest_id'),
            policy_id=self.context.get('policy_id'),
            validation_status=(
                ValidationStatus.VALID
                if self.context.get('manifest_valid') and self.context.get('policy_valid')
                else ValidationStatus.PENDING
            ),
            mcp_validated=self.context.get('mcp_validated', False),
            tee_validated=self.context.get('tee_validated', False),
        )
