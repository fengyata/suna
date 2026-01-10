"""
Flashintel API Service

This module provides a service for interacting with the Flashintel API.
"""

from typing import Dict, Any
from core.utils.logger import logger
from core.utils.config import config
from core.services.http_client import get_http_client


class FlashintelService:
    """Service for interacting with Flashintel API."""

    def __init__(self):
        """Initialize Flashintel service."""
        self.base_url = config.FLASHINTEL_BASE_URL or "https://discover-api-test.flashintel.ai"
        logger.debug(f"FlashintelService initialized with base_url: {self.base_url}")

    async def check_token(self, token: str, company_id: str) -> Dict[str, Any]:
        """
        Check token validity with Flashintel API.

        Args:
            token: Authorization token (bearer token)
            company_id: Company ID for x-auth-company header

        Returns:
            Dictionary containing the API response:
            {
                "code": 200,
                "data": {
                    "companyId": "1001016",
                    "companyUuid": "4db4ff64-9fae-4e29-a016-ad9b574ddea7",
                    "userRole": "admin",
                    "userId": "4662"
                },
                "logId": "",
                "msg": "Operation successful!"
            }

        Raises:
            httpx.HTTPError: If the API request fails (network error, timeout, etc.)
            httpx.HTTPStatusError: If the API returns a non-2xx status code
        """
        url = f"{self.base_url}/api/v2/auth/check-token"
        headers = {
            "Authorization": f"bearer {token}",
            "x-auth-company": company_id,
        }

        logger.debug(f"Checking Flashintel token for company_id: {company_id}")

        try:
            async with get_http_client() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                result = response.json()
                logger.debug(f"Flashintel check_token response: {result}")
                return result
        except Exception as e:
            logger.error(f"Flashintel check_token failed: {e}")
            raise

