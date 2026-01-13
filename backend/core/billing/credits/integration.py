from decimal import Decimal
from typing import Optional, Dict, Tuple, List
from datetime import datetime, timezone
from core.billing.credits.calculator import calculate_token_cost, calculate_cached_token_cost, calculate_cache_write_cost
from core.billing.credits.manager import credit_manager
from core.utils.config import config, EnvMode
from core.utils.logger import logger
from ..shared.config import is_model_allowed
from ..shared.cache_utils import invalidate_account_state_cache

# Import token service for Flashlabs billing
from core.services.api_billing_service import token_service, FeatIdConfig


class BillingIntegration:
    @staticmethod
    async def check_and_reserve_credits(account_id: str, estimated_tokens: int = 10000) -> Tuple[bool, str, Optional[str]]:
        # Use Flashlabs Token service for balance check
        can_run, remaining, message = await token_service.check_balance(account_id)
        
        if not can_run:
            return False, message, None
        
        return True, message, None
    
    @staticmethod
    async def check_model_and_billing_access(
        account_id: str, 
        model_name: Optional[str], 
        client=None
    ) -> Tuple[bool, str, Dict]:
        # In local mode, skip model-tier gating (dev convenience), but still run the
        # billing check (token_service will no-op unless enabled for local testing).
        if config.ENV_MODE == EnvMode.LOCAL:
            if not model_name:
                # Keep consistent behavior with non-local path
                return False, "No model specified", {"error_type": "no_model"}
            can_run, message, reservation_id = await BillingIntegration.check_and_reserve_credits(account_id)
            if not can_run:
                return False, f"Billing check failed: {message}", {
                    "error_type": "insufficient_credits"
                }
            return True, "Access granted", {
                "local_mode": True,
                "reservation_id": reservation_id
            }
        
        try:
            if not model_name:
                return False, "No model specified", {"error_type": "no_model"}

            from ..subscriptions import subscription_service
            
            tier_info = await subscription_service.get_user_subscription_tier(account_id)
            tier_name = tier_info.get('name', 'none')
            
            if not is_model_allowed(tier_name, model_name):
                available_models = tier_info.get('models', [])
                return False, f"Your current subscription plan does not include access to {model_name}. Please upgrade your subscription.", {
                    "allowed_models": available_models,
                    "tier_info": tier_info,
                    "tier_name": tier_name,
                    "error_type": "model_access_denied",
                    "error_code": "MODEL_ACCESS_DENIED"
                }
            
            can_run, message, reservation_id = await BillingIntegration.check_and_reserve_credits(account_id)
            if not can_run:
                return False, f"Billing check failed: {message}", {
                    "tier_info": tier_info,
                    "error_type": "insufficient_credits"
                }
            
            # All checks passed
            return True, "Access granted", {
                "tier_info": tier_info,
                "reservation_id": reservation_id
            }
            
        except Exception as e:
            logger.error(f"Error in unified billing check for user {account_id}: {e}")
            return False, f"Error checking access: {str(e)}", {"error_type": "system_error"}
    
    @staticmethod
    async def deduct_usage(
        account_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        model: str,
        message_id: Optional[str] = None,
        thread_id: Optional[str] = None,
        cache_read_tokens: int = 0,
        cache_creation_tokens: int = 0
    ) -> Dict:
        # Handle cache reads and writes separately with actual pricing
        if cache_read_tokens > 0 or cache_creation_tokens > 0:
            non_cached_prompt_tokens = prompt_tokens - cache_read_tokens - cache_creation_tokens
            
            # Calculate costs for each component
            cached_read_cost = Decimal('0')
            cache_write_cost = Decimal('0')

            if cache_read_tokens > 0:
                # Use actual cached read pricing from registry
                cached_read_cost = calculate_cached_token_cost(cache_read_tokens, model)
            
            if cache_creation_tokens > 0:
                # Use actual cache write pricing from registry
                # We use 5-minute cache writes (ephemeral without TTL) as per prompt_caching.py
                cache_write_cost = calculate_cache_write_cost(cache_creation_tokens, model, cache_ttl="5m")
            
            # Regular non-cached tokens
            non_cached_cost = calculate_token_cost(non_cached_prompt_tokens, completion_tokens, model)
            
            cost = cached_read_cost + cache_write_cost + non_cached_cost
            
            logger.debug(f"[BILLING] Cost breakdown: cached_read=${cached_read_cost:.6f} + cache_write=${cache_write_cost:.6f} + regular=${non_cached_cost:.6f} = total=${cost:.6f}")
        else:
            cost = calculate_token_cost(prompt_tokens, completion_tokens, model)
        
        if cost <= 0:
            logger.warning(f"Zero cost calculated for {model} with {prompt_tokens}+{completion_tokens} tokens")
            # Note: token service does not return balance here; avoid returning a misleading placeholder.
            return {'success': True, 'cost': 0, 'new_balance': 0}
        
        logger.debug(f"[BILLING] Calculated cost: ${cost:.6f} for {model}")
        
        # Use Flashlabs Token service for deduction
        try:
            # message_id is required for idempotency
            if not message_id:
                import uuid
                message_id = f"{thread_id or 'unknown'}:llm:{uuid.uuid4()}"
            
            success = await token_service.deduct_for_llm(
                account_uuid=account_id,
                cost_usd=cost,
                model=model,
                message_id=message_id
            )
            
            if success:
                # Calculate token value for logging
                token_value = token_service.usd_to_token(cost)
                logger.debug(f"[BILLING] Successfully deducted {token_value} tokens (${cost:.6f}) from user {account_id}")
                await invalidate_account_state_cache(account_id)
                return {
                    'success': True,
                    'cost': float(cost),
                    'token_value': token_value,
                    'new_balance': 0  # We don't get balance back from token service
                }
            else:
                logger.error(f"[BILLING] Failed to deduct tokens for user {account_id}")
                return {
                    'success': False,
                    'cost': float(cost),
                    'error': 'Token deduction failed'
                }
        except Exception as e:
            logger.error(f"[BILLING] Token deduction error for user {account_id}: {e}")
            return {
                'success': False,
                'cost': float(cost),
                'error': str(e)
            }
    
    @staticmethod 
    async def get_credit_summary(account_id: str) -> Dict:
        # Use token service for balance display
        return await token_service.get_balance_for_display(account_id)
    
    @staticmethod
    async def add_credits(
        account_id: str,
        amount: Decimal, 
        description: str = "Credits added",
        is_expiring: bool = True,
        **kwargs
    ) -> Dict:
        # Note: add_credits is not supported by Flashlabs Token service
        # This method is kept for backwards compatibility but will not work
        logger.warning(f"[BILLING] add_credits called but not supported by Flashlabs Token service")
        result = await credit_manager.add_credits(
            account_id=account_id,
            amount=amount,
            description=description,
            is_expiring=is_expiring,
            **kwargs
        )
        await invalidate_account_state_cache(account_id)
        return result

billing_integration = BillingIntegration()
