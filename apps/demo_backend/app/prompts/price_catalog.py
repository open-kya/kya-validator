"""Price Catalog for Cloud Infrastructure and AI Services.

This module provides a PriceCatalog class for managing and querying
service pricing information from a YAML configuration file.
"""
from typing import Dict, Any, Optional, List, Union
from pathlib import Path

import yaml


class PriceCatalog:
    """
    Manages pricing information for cloud infrastructure and AI services.

    The PriceCatalog loads pricing data from a YAML file and provides
    methods to query pricing for different services and tiers.
    """

    def __init__(self, catalog_path: Optional[Union[str, Path]] = None):
        """Initialize the PriceCatalog.

        Args:
            catalog_path: Path to the pricing catalog YAML file.
                          If None, uses the default path.
        """
        if catalog_path is None:
            # Default path relative to this module
            module_dir = Path(__file__).parent
            catalog_path = module_dir.parent.parent / 'prompts' / 'pricing_catalog.yaml'

        self.catalog_path: Path = Path(catalog_path)
        self._catalog: Optional[Dict[str, Any]] = None

    def load_catalog(self) -> Dict[str, Any]:
        """Load the pricing catalog from the YAML file.

        Returns:
            Dictionary containing the pricing catalog data.

        Raises:
            FileNotFoundError: If the catalog file doesn't exist.
        """
        if self._catalog is not None:
            return self._catalog

        if not self.catalog_path.exists():
            raise FileNotFoundError(
                f'Pricing catalog not found at {self.catalog_path}',
            )

        with open(self.catalog_path, 'r') as f:
            self._catalog = yaml.safe_load(f)

        return self._catalog

    def get_service_pricing(
        self,
        service_name: str,
        tier: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get pricing information for a specific service.

        Args:
            service_name: Name of the service (e.g., 'compute_gpu').
            tier: Optional tier name (e.g., 'on-demand', 'reserved', 'annual').
                  If None, returns pricing for the first tier.

        Returns:
            Dictionary containing pricing information including:
            - base_price: The base price
            - currency: Currency unit
            - description: Service description
            - tier: Tier name
            - discount: Tier discount (0.0-1.0)
            - final_price: Price after discount

            Returns None if service is not found.
        """
        catalog = self.load_catalog()
        services = catalog.get('services', {})

        if service_name not in services:
            return None

        service_info = services[service_name]
        tiers = service_info.get('tiers', [])

        if not tiers:
            return None

        # Find the requested tier or use the first one
        tier_info = None
        if tier is not None:
            for t in tiers:
                if t['name'] == tier:
                    tier_info = t
                    break
        else:
            tier_info = tiers[0]

        if tier_info is None:
            return None

        discount = tier_info.get('discount', 0)
        base_price = service_info.get('base_price', 0)
        final_price = base_price * (1 - discount)

        return {
            'service_name': service_name,
            'base_price': base_price,
            'currency': service_info.get('currency', 'USD'),
            'description': service_info.get('description', ''),
            'tier': tier_info['name'],
            'discount': discount,
            'final_price': final_price,
        }

    def calculate_price(
        self,
        service_name: str,
        quantity: float,
        tier: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Calculate the total price for a service at a given quantity.

        Args:
            service_name: Name of the service.
            quantity: Quantity of the service (e.g., hours, GB, requests).
            tier: Optional tier name.

        Returns:
            Dictionary containing:
            - service_name: Name of the service
            - quantity: The requested quantity
            - unit_price: Price per unit after discount
            - currency: Currency unit
            - total_price: Total price (quantity * unit_price)
            - tier: Tier name

            Returns None if service is not found.
        """
        pricing = self.get_service_pricing(service_name, tier)
        if pricing is None:
            return None

        unit_price = pricing['final_price']
        total_price = unit_price * quantity

        return {
            'service_name': service_name,
            'quantity': quantity,
            'unit_price': unit_price,
            'currency': pricing['currency'],
            'total_price': total_price,
            'tier': pricing['tier'],
        }

    def get_available_services(self) -> List[str]:
        """
        Get a list of all available services.

        Returns:
            List of service names.
        """
        catalog = self.load_catalog()
        return list(catalog.get('services', {}).keys())

    def get_service_tiers(self, service_name: str) -> Optional[List[str]]:
        """
        Get available tiers for a specific service.

        Args:
            service_name: Name of the service.

        Returns:
            List of tier names, or None if service is not found.
        """
        catalog = self.load_catalog()
        services = catalog.get('services', {})

        if service_name not in services:
            return None

        tiers = services[service_name].get('tiers', [])
        return [tier['name'] for tier in tiers]


# Global instance for easy access
_default_catalog: Optional[PriceCatalog] = None


def get_price_catalog(catalog_path: Optional[str] = None) -> PriceCatalog:
    """
    Get a PriceCatalog instance.

    Args:
        catalog_path: Optional path to the pricing catalog file.

    Returns:
        PriceCatalog instance.
    """
    global _default_catalog
    if _default_catalog is None:
        _default_catalog = PriceCatalog(catalog_path)
    return _default_catalog
