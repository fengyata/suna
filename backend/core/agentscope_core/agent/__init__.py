"""
Agent module for AgentScope integration.

Provides factory functions and configuration for creating AgentScope agents.

Note: Uses lazy imports to avoid loading agentscope at module import time.
"""

__all__ = ['create_agent', 'AgentConfig']


def __getattr__(name):
    """Lazy import to avoid loading agentscope at module import time."""
    if name == 'create_agent':
        from core.agentscope_core.agent.factory import create_agent
        return create_agent
    elif name == 'AgentConfig':
        from core.agentscope_core.agent.config import AgentConfig
        return AgentConfig
    raise AttributeError(f"module 'core.agentscope_core.agent' has no attribute '{name}'")
