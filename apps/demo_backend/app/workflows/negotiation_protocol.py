"""
Negotiation protocol for Type B (Agent Client/Receiver) interactions.
"""
from typing import Dict, Any, Optional, List
import asyncio

from ..comms.schemas import (
    NegotiationOffer,
    NegotiationResponse,
    ValidationContext,
    ValidationStatus,
)


class NegotiationProtocol:
    """
    Manages the negotiation protocol between procurement and recipient agents.
    """

    def __init__(self, protocol_id: str, config: Optional[Dict[str, Any]] = None):
        self.protocol_id = protocol_id
        self.config = config or {}
        self.turn_count = 0
        self.max_turns = self.config.get('max_turns', 10)
        self.history: List[Dict[str, Any]] = []
        self.constraints: List[str] = self.config.get('constraints', [])
        self.agreed_terms: Optional[Dict[str, Any]] = None

    async def create_offer(
        self, from_agent: str, terms: Dict[str, Any]
    ) -> NegotiationOffer:
        """Create a negotiation offer."""
        self.turn_count += 1

        offer = NegotiationOffer(
            offer_id=f'offer-{self.turn_count}',
            from_agent=from_agent,
            terms=terms,
            constraints=self.constraints,
        )

        self.history.append({
            'type': 'offer',
            'offer_id': offer.offer_id,
            'from_agent': from_agent,
            'terms': terms,
            'turn': self.turn_count,
        })

        return offer

    async def respond_to_offer(
        self, offer: NegotiationOffer, response_type: str, reasoning: Optional[str] = None
    ) -> NegotiationResponse:
        """Respond to a negotiation offer."""
        response = NegotiationResponse(
            offer_id=offer.offer_id,
            response_type=response_type,
            reasoning=reasoning,
        )

        self.history.append({
            'type': 'response',
            'offer_id': offer.offer_id,
            'response_type': response_type,
            'reasoning': reasoning,
            'turn': self.turn_count,
        })

        return response

    async def validate_offer(
        self, offer: NegotiationOffer, policy_constraints: List[str]
    ) -> tuple[bool, List[str]]:
        """Validate an offer against policy constraints."""
        errors = []

        for constraint in policy_constraints:
            if not self._check_constraint(offer.terms, constraint):
                errors.append(f'Constraint violation: {constraint}')

        is_valid = len(errors) == 0
        return is_valid, errors

    def _check_constraint(self, terms: Dict[str, Any], constraint: str) -> bool:
        """Check if terms satisfy a constraint."""
        # Simplified constraint checking
        if 'min_availability' in constraint:
            min_avail = float(constraint.split('=')[-1].strip())
            current_avail = terms.get('availability', 99.9)
            return current_avail >= min_avail

        if 'max_price' in constraint:
            max_price = float(constraint.split('=')[-1].strip())
            current_price = terms.get('price', 0)
            return current_price <= max_price

        if 'region' in constraint:
            allowed_regions = constraint.split('=')[-1].strip().split(',')
            current_region = terms.get('region', 'us-east-1')
            return current_region in allowed_regions

        return True

    async def calculate_concession(
        self, offer: NegotiationOffer, counter_offer: Dict[str, Any]
    ) -> float:
        """Calculate the concession percentage."""
        original_price = offer.terms.get('price', 0)
        counter_price = counter_offer.get('price', original_price)

        if original_price == 0:
            return 0.0

        concession = (original_price - counter_price) / original_price
        return max(0.0, concession)

    async def is_complete(self) -> bool:
        """Check if negotiation is complete."""
        return self.agreed_terms is not None or self.turn_count >= self.max_turns

    async def get_agreement(self) -> Optional[Dict[str, Any]]:
        """Get the final agreement if reached."""
        return self.agreed_terms

    def get_history(self) -> List[Dict[str, Any]]:
        """Get the negotiation history."""
        return self.history.copy()
