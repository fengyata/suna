"""
Billing Hooks for AgentScope agents.

Handles credit checking and billing integration during agent execution.
"""

import asyncio
from typing import Optional, Dict, Any

from core.utils.logger import logger


class InsufficientCreditsError(Exception):
    """Raised when user has insufficient credits to run the agent."""
    pass


class BillingHooks:
    """
    Billing hooks for credit checking in AgentScope agents.
    
    Performs credit check in pre_reasoning to fail fast before LLM calls.
    """
    
    def __init__(
        self,
        account_id: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        """
        Initialize billing hooks.
        
        Args:
            account_id: User account ID for billing
            model_name: Model name for tier checking
        """
        self.account_id = account_id
        self.model_name = model_name
        self._checked = False  # Only check once per run
    
    async def pre_reasoning(self, kwargs: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Pre-reasoning hook to check credits before LLM call.
        
        Called before each LLM reasoning step.
        Only performs check on first call per agent run.
        
        Args:
            kwargs: Input arguments to the reasoning step
            
        Returns:
            kwargs unchanged if credits available
            
        Raises:
            InsufficientCreditsError: If credits are insufficient
        """
        # Only check once per agent run to avoid repeated billing calls
        if self._checked:
            return kwargs
        
        self._checked = True
        
        if not self.account_id:
            logger.debug("[BILLING] No account_id, skipping credit check")
            return kwargs
        
        try:
            from core.billing.credits.integration import billing_integration
            
            can_run, message, _ = await billing_integration.check_and_reserve_credits(
                self.account_id
            )
            
            if not can_run:
                logger.warning(
                    f"[BILLING] Insufficient credits for {self.account_id}: {message}"
                )
                raise InsufficientCreditsError(message)
            
            logger.debug(f"[BILLING] Credit check passed for {self.account_id}")
            
        except InsufficientCreditsError:
            raise
        except Exception as e:
            # Log but don't block on billing errors (fail-open for better UX)
            logger.error(f"[BILLING] Error checking credits: {e}", exc_info=True)
        
        return kwargs
    
    def reset(self) -> None:
        """Reset the check flag for a new agent run."""
        self._checked = False

