"""
AgentScope Core Module

This module provides the integration layer between AgentScope framework
and the existing Suna backend infrastructure.

Note: Imports are kept minimal to avoid circular imports and
allow the module to be imported even if agentscope is not installed.

Important:
- Importing `core.agentscope_core` should not require `agentscope` to be installed.
- Accessing AgentScope-backed entrypoints (e.g. `create_agent`, `run_with_agentscope`)
  will still require `agentscope` at call/import time of the specific submodule.
"""

# Lazy exports via __getattr__.
# Keep this file import-light so `import core.agentscope_core` doesn't eagerly
# import submodules that depend on the external `agentscope` package.

__all__ = [
    # Agent
    'create_agent',
    'AgentConfig',
    # Runner
    'run_with_agentscope',
    'AgentScopeRunner',
    # Executor (new entry point)
    'execute_agent_run_agentscope',
    # Hooks
    'BillingHooks',
    'InsufficientCreditsError',
    # Toolkit adapters
    'JITToolkitAdapter',
]

def __getattr__(name):
    """Lazy import to avoid loading agentscope at module import time."""
    if name == 'create_agent':
        from core.agentscope_core.agent.factory import create_agent
        return create_agent
    elif name == 'AgentConfig':
        from core.agentscope_core.agent.config import AgentConfig
        return AgentConfig
    elif name == 'run_with_agentscope':
        from core.agentscope_core.runner import run_with_agentscope
        return run_with_agentscope
    elif name == 'AgentScopeRunner':
        from core.agentscope_core.runner import AgentScopeRunner
        return AgentScopeRunner
    elif name == 'execute_agent_run_agentscope':
        from core.agentscope_core.executor import execute_agent_run_agentscope
        return execute_agent_run_agentscope
    elif name == 'BillingHooks':
        from core.agentscope_core.hooks.billing_hooks import BillingHooks
        return BillingHooks
    elif name == 'InsufficientCreditsError':
        from core.agentscope_core.hooks.billing_hooks import InsufficientCreditsError
        return InsufficientCreditsError
    elif name == 'JITToolkitAdapter':
        from core.agentscope_core.toolkit.jit_adapter import JITToolkitAdapter
        return JITToolkitAdapter
    raise AttributeError(f"module 'core.agentscope_core' has no attribute '{name}'")
