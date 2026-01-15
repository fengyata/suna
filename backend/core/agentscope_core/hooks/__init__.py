"""
Hooks module for AgentScope integration.

Provides custom hooks for DB persistence, streaming, termination, and billing.
"""

from core.agentscope_core.hooks.db_hooks import DBHooks
from core.agentscope_core.hooks.streaming_hooks import StreamingHooks
from core.agentscope_core.hooks.termination_hooks import TerminationHooks
from core.agentscope_core.hooks.billing_hooks import BillingHooks, InsufficientCreditsError

__all__ = [
    'DBHooks',
    'StreamingHooks',
    'TerminationHooks',
    'BillingHooks',
    'InsufficientCreditsError',
]

