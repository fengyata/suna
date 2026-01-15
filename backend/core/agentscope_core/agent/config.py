"""
Agent Configuration for AgentScope integration.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class AgentConfig:
    """
    Configuration for creating an AgentScope agent.
    
    Attributes:
        thread_id: Unique identifier for the conversation thread
        model_name: LLM model to use (e.g., 'claude-3-5-sonnet-20241022', 'gpt-4o')
        system_prompt: System prompt for the agent
        max_iters: Maximum number of ReAct iterations (default: 25)
        temperature: LLM temperature setting
        tool_execution_strategy: 'sequential' only (parallel removed)
        memory_context: Additional context to inject (user memories, file content)
        account_id: User account ID for billing
        project_id: Project ID for context
        agent_run_id: Unique identifier for this agent run
        is_new_thread: Whether this is a new thread (affects tool restoration)
    """
    
    thread_id: str
    model_name: str = "claude-3-5-sonnet-20241022"
    system_prompt: Optional[str] = None
    max_iters: int = 25
    temperature: float = 0.7
    tool_execution_strategy: str = "sequential"
    memory_context: Optional[Dict[str, Any]] = None
    account_id: Optional[str] = None
    project_id: Optional[str] = None
    agent_run_id: Optional[str] = None
    
    # Raw agent config dict for PromptManager
    agent_config_dict: Optional[Dict[str, Any]] = None
    
    # Langfuse tracing
    enable_tracing: bool = True
    trace: Optional[Any] = None
    
    # Native tool calling settings
    native_tool_calling: bool = True
    execute_tools: bool = True
    
    # Compression settings (using AgentScope built-in CompressionConfig)
    compression_enabled: bool = True
    compression_token_threshold: int = 100000  # Trigger compression at 100k tokens
    compression_keep_recent: int = 10  # Keep last 10 messages uncompressed
    
    # Thread state
    is_new_thread: bool = False
    
    def __post_init__(self):
        """Validate configuration."""
        if self.tool_execution_strategy != "sequential":
            raise ValueError("Only 'sequential' tool execution strategy is supported")
        if self.max_iters < 1:
            raise ValueError("max_iters must be at least 1")

