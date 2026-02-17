"""
Type C: Documentation-Based Store Front.
"""
from typing import Dict, Any, Optional, List
import asyncio

from ..comms.schemas import (
    WorkflowState,
    WorkflowStep,
    ValidationContext,
    ValidationStatus,
)


class DocStorefront:
    """
    Type C: Documentation-Based Store Front.
    Semi-structured doc parsing and AI-understandable documentation.
    """

    def __init__(self, workflow_id: str, config: Optional[Dict[str, Any]] = None):
        self.workflow_id = workflow_id
        self.config = config or {}
        self.current_stage = 'document_upload'
        self.context: Dict[str, Any] = {}
        self.documents: List[Dict[str, Any]] = []

    async def get_state(self) -> WorkflowState:
        """Get the current workflow state."""
        return WorkflowState(
            workflow_id=self.workflow_id,
            current_state=self.current_stage,
            available_transitions=self._get_available_transitions(),
            context=self.context.copy(),
        )

    def _get_available_transitions(self) -> List[str]:
        """Get available transitions based on current stage."""
        transitions = {
            'document_upload': ['parse_documents', 'cancel'],
            'parse_documents': ['review_requirements', 'cancel'],
            'review_requirements': ['attach_policy', 'cancel'],
            'attach_policy': ['submit_request', 'cancel'],
            'submit_request': ['complete'],
            'complete': [],
        }
        return transitions.get(self.current_stage, [])

    async def transition_to(self, new_stage: str) -> WorkflowStep:
        """Transition to a new stage."""
        valid_transitions = self._get_available_transitions()

        if new_stage not in valid_transitions:
            return WorkflowStep(
                workflow_id=self.workflow_id,
                step_name=f'transition_{self.current_stage}_to_{new_stage}',
                step_status='failed',
                error=f'Invalid transition from {self.current_stage} to {new_stage}',
            )

        # Execute stage-specific logic
        result = await self._execute_stage_logic(new_stage)

        if result.get('error'):
            return WorkflowStep(
                workflow_id=self.workflow_id,
                step_name=new_stage,
                step_status='failed',
                error=result['error'],
            )

        self.current_stage = new_stage
        self.context.update(result.get('context', {}))

        return WorkflowStep(
            workflow_id=self.workflow_id,
            step_name=new_stage,
            step_status='completed',
            result=result,
        )

    async def _execute_stage_logic(self, stage: str) -> Dict[str, Any]:
        """Execute logic for a specific stage."""
        if stage == 'parse_documents':
            return await self._handle_parse_documents()
        elif stage == 'review_requirements':
            return await self._handle_review_requirements()
        elif stage == 'attach_policy':
            return await self._handle_attach_policy()
        elif stage == 'submit_request':
            return await self._handle_submit_request()
        elif stage == 'complete':
            return await self._handle_complete()
        else:
            return {'context': {}}

    async def _handle_parse_documents(self) -> Dict[str, Any]:
        """Parse uploaded documents into structured requirements."""
        await asyncio.sleep(0.5)

        # Simulate parsing documents
        parsed_requirements = {
            'service_type': 'gpu_compute',
            'gpu_type': 'A100',
            'quantity': 4,
            'duration_months': 12,
            'requirements': {
                'availability': '99.9%',
                'support': '24/7',
                'region': 'us-east-1',
            },
        }

        return {
            'context': {
                'parsed_requirements': parsed_requirements,
                'documents_parsed': len(self.documents),
            }
        }

    async def _handle_review_requirements(self) -> Dict[str, Any]:
        """Review the parsed requirements."""
        parsed = self.context.get('parsed_requirements', {})

        # Generate AI-understandable documentation
        ai_doc = self._generate_ai_documentation(parsed)

        return {
            'context': {
                'ai_documentation': ai_doc,
                'requirements_reviewed': True,
            }
        }

    def _generate_ai_documentation(self, requirements: Dict[str, Any]) -> str:
        """Generate AI-understandable documentation."""
        return f"""
# Procurement Requirements Document

## Service Type
{requirements.get('service_type', 'Unknown')}

## Specifications
- GPU Type: {requirements.get('gpu_type', 'N/A')}
- Quantity: {requirements.get('quantity', 0)}
- Duration: {requirements.get('duration_months', 0)} months

## Service Level Requirements
- Availability: {requirements.get('requirements', {}).get('availability', 'N/A')}
- Support: {requirements.get('requirements', {}).get('support', 'N/A')}
- Region: {requirements.get('requirements', {}).get('region', 'N/A')}

## Compliance Notes
This procurement request must comply with organizational policies
for cloud infrastructure procurement.
"""

    async def _handle_attach_policy(self) -> Dict[str, Any]:
        """Attach a policy manifest for validation."""
        # Generate a policy manifest
        policy_manifest = {
            'id': 'policy-doc-001',
            'version': '1.0',
            'constraints': [
                'min_availability=99.9',
                'max_price=5000',
                'region=us-east-1,us-west-2',
            ],
            'compliance': ['SOC2', 'GDPR', 'ISO27001'],
        }

        return {
            'context': {
                'policy_manifest': policy_manifest,
                'policy_attached': True,
            }
        }

    async def _handle_submit_request(self) -> Dict[str, Any]:
        """Submit the structured request to the procurement agent."""
        request = {
            'requirements': self.context.get('parsed_requirements', {}),
            'constraints': self.context.get('policy_manifest', {}).get('constraints', []),
            'documentation': self.context.get('ai_documentation', ''),
        }

        return {
            'context': {
                'procurement_request': request,
                'request_submitted': True,
                'request_id': f'REQ-{asyncio.get_event_loop().time():.0f}',
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

    async def add_document(self, document: Dict[str, Any]) -> None:
        """Add a document for processing."""
        self.documents.append(document)

    def get_validation_context(self) -> ValidationContext:
        """Get the current validation context."""
        policy = self.context.get('policy_manifest', {})
        return ValidationContext(
            policy_id=policy.get('id'),
            validation_status=(
                ValidationStatus.VALID
                if self.context.get('request_submitted')
                else ValidationStatus.PENDING
            ),
        )
