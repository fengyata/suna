"""
Termination Hooks for AgentScope.

Handles agent termination when specific tools are called.

Hook signatures (AgentScope):
- Pre-hook: (self, kwargs: dict) -> dict | None
- Post-hook: (self, kwargs: dict, output: Any) -> Any | None
"""

from typing import Set, Any, Optional

from core.utils.logger import logger


# Tools that should terminate the agent loop
TERMINATING_TOOLS: Set[str] = {'ask', 'complete'}


class TerminationHooks:
    """
    Hooks for handling agent termination.
    
    When a terminating tool (ask, complete) is executed,
    this hook will interrupt the agent's ReAct loop.
    """
    
    def __init__(self, agent: Any = None):
        """
        Initialize termination hooks.
        
        Args:
            agent: ReActAgent instance for interruption
        """
        self.agent = agent
        self._should_terminate: bool = False
        self._termination_reason: Optional[str] = None
    
    def post_acting(self, kwargs: dict, output: Any) -> Any:
        """
        AgentScope post_acting hook.
        
        Called after tool execution. Checks if the tool should terminate the agent.
        
        Args:
            kwargs: Hook context (contains tool_name, etc.)
            output: Tool execution result
            
        Returns:
            output (unchanged)
        """
        tool_name = kwargs.get('tool_name', '')
        
        if tool_name in TERMINATING_TOOLS:
            logger.info(f"Terminating tool '{tool_name}' executed, stopping agent loop")
            self._should_terminate = True
            self._termination_reason = tool_name
            
            # Interrupt the agent if available
            # AgentScope's ReActAgent inherits from AgentBase which has interrupt()
            if self.agent and hasattr(self.agent, 'interrupt'):
                self.agent.interrupt()
        
        return output
    
    def should_terminate(self) -> bool:
        """Check if agent should terminate."""
        return self._should_terminate
    
    def get_termination_reason(self) -> Optional[str]:
        """Get the reason for termination."""
        return self._termination_reason
    
    def reset(self) -> None:
        """Reset termination state."""
        self._should_terminate = False
        self._termination_reason = None
