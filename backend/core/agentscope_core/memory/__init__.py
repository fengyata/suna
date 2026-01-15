"""
Memory module for AgentScope integration.

Provides custom memory implementations that integrate with Supabase
for message persistence.

Note: Context compression is handled by AgentScope's built-in CompressionConfig,
not a custom ContextCompressor.
"""

from core.agentscope_core.memory.supabase_memory import SupabaseMemory

__all__ = ['SupabaseMemory']
