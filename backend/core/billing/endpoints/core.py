"""
Legacy billing endpoints.

NOTE: These endpoints are marked as legacy. The billing system has been migrated
to the Flashlabs Token service. These endpoints are kept for backwards compatibility
but may return limited or placeholder data.

For current billing information, use:
- /billing/account-state - Get complete account state including token balance
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from core.services.credits import credit_service
from core.utils.auth_utils import verify_and_get_user_id_from_jwt
from core.utils.config import config, EnvMode
from core.utils.logger import logger
from core.services.api_billing_service import token_service, FeatIdConfig
from ..shared.config import (
    TOKEN_PRICE_MULTIPLIER, 
    get_tier_by_name,
    TIERS,
    CREDITS_PER_DOLLAR,
    get_tier_limits
)
from ..shared.models import TokenUsageRequest
from ..credits.calculator import calculate_token_cost
from ..credits.manager import credit_manager
from ..shared.cache_utils import invalidate_account_state_cache

router = APIRouter(tags=["billing-core"])


@router.post("/deduct")
async def deduct_token_usage(
    usage: TokenUsageRequest,
    account_id: str = Depends(verify_and_get_user_id_from_jwt)
) -> Dict:
    """
    LEGACY: Deduct token usage.
    
    This endpoint has been migrated to use Flashlabs Token service.
    """
    cost = calculate_token_cost(usage.prompt_tokens, usage.completion_tokens, usage.model)
    
    if cost <= 0:
        return {'success': True, 'cost': 0, 'new_balance': 0}
    
    try:
        # Use Flashlabs Token service for deduction
        message_id = usage.message_id or f"{usage.thread_id or 'unknown'}:direct:{datetime.now(timezone.utc).timestamp()}"
        
        success = await token_service.deduct_for_llm(
            account_uuid=account_id,
            cost_usd=cost,
            model=usage.model,
            message_id=message_id
        )
        
        await invalidate_account_state_cache(account_id)
        
        return {
            'success': success,
            'cost': float(cost) * CREDITS_PER_DOLLAR,
            'new_balance': 0,  # Token service doesn't return balance
            'usage': {
                'prompt_tokens': usage.prompt_tokens,
                'completion_tokens': usage.completion_tokens,
                'model': usage.model
            }
        }
    except Exception as e:
        logger.error(f"[BILLING] Deduction error: {e}")
        return {
            'success': False,
            'cost': float(cost) * CREDITS_PER_DOLLAR,
            'error': str(e)
        }


@router.get("/tier-configurations") 
async def get_tier_configurations() -> Dict:
    """Get tier configurations (not affected by migration)."""
    try:
        tier_configs = []
        for tier_key, tier in TIERS.items():
            if tier_key == 'none':
                continue
                
            tier_config = {
                'tier_key': tier_key,  
                'name': tier.name,
                'display_name': tier.display_name,
                'monthly_credits': float(tier.monthly_credits),
                'can_purchase_credits': tier.can_purchase_credits,
                'project_limit': tier.project_limit,
                'price_ids': tier.price_ids,
            }
            tier_configs.append(tier_config)
        
        return {
            'success': True,
            'tiers': tier_configs,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting tier configurations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get tier configurations")


@router.get("/credit-breakdown")
async def get_credit_breakdown(
    account_id: str = Depends(verify_and_get_user_id_from_jwt)
) -> Dict:
    """
    LEGACY: Get credit breakdown.
    
    This endpoint is deprecated. The billing system has been migrated to
    Flashlabs Token service. Use /billing/account-state for current balance.
    """
    logger.warning(f"[BILLING] Legacy /credit-breakdown endpoint called by {account_id}")
    
    try:
        # Return token balance from new service
        balance_info = await token_service.get_balance_for_display(account_id)
        
        return {
            "balance": balance_info.get('remaining', 0),
            "total_purchased": 0,  # Not available from token service
            "breakdown": [],  # Not available from token service
            "_legacy": True,
            "_message": "This endpoint is deprecated. Use /billing/account-state for current balance."
        }
    except Exception as e:
        logger.error(f"[BILLING] Error getting credit breakdown: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage-history")
async def get_usage_history(
    days: int = 30,
    account_id: str = Depends(verify_and_get_user_id_from_jwt)
) -> Dict:
    """
    LEGACY: Get usage history.
    
    This endpoint is deprecated. The billing system has been migrated to
    Flashlabs Token service. Usage history is now managed by the token service.
    """
    logger.warning(f"[BILLING] Legacy /usage-history endpoint called by {account_id}")
    
    # IMPORTANT: Keep response shape compatible with frontend UsageHistory type
    # (apps/frontend/src/lib/api/billing.ts -> interface UsageHistory)
    return {
        "daily_usage": {},  # Not available from token service
        "total_period_usage": 0,
        "total_period_credits": 0,
        "_legacy": True,
        "_message": "This endpoint is deprecated. Usage history is now managed by Flashlabs Token service."
    }
