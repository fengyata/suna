"""
Toolkit module for AgentScope integration.

Provides adapters for registering existing tools with AgentScope's Toolkit.

Tool Registration Strategy:
- ToolkitAdapter: Migrates most tools from native ToolRegistry to AgentScope Toolkit
- MCPAdapter: Handles discover_mcp_tools/execute_mcp_tool (needs independent mcp_wrapper)
- JITToolkitAdapter: Handles initialize_tools (must register to Toolkit, not ToolRegistry)
- expand_message: Migrated from native ExpandMessageTool via ToolkitAdapter
"""

from core.agentscope_core.toolkit.adapter import ToolkitAdapter
from core.agentscope_core.toolkit.mcp_adapter import MCPAdapter
from core.agentscope_core.toolkit.jit_adapter import JITToolkitAdapter

__all__ = [
    'ToolkitAdapter',
    'MCPAdapter',
    'JITToolkitAdapter',
]

