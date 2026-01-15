"""
Database Hooks for AgentScope.

These hooks handle side effects that occur after reasoning and acting phases:
- Billing (token usage tracking)
- Langfuse tracing (if enabled)

NOTE: Message persistence is now handled by SupabaseMemory.add()
which is called automatically by AgentScope's ReActAgent.

Hook signatures (AgentScope):
- Pre-hook: (self, kwargs: dict) -> dict | None
- Post-hook: (self, kwargs: dict, output: Any) -> Any | None
"""

import uuid
import asyncio
from typing import Dict, Any, Optional

from core.utils.logger import logger


class DBHooks:
    """
    Hooks for handling side effects after AgentScope operations.
    
    Responsibilities:
    - Billing: Track token usage and deduct credits
    - Tracing: Send data to Langfuse (if enabled)
    
    NOTE: Message saving is handled by SupabaseMemory, not these hooks.
    """
    
    def __init__(
        self,
        thread_id: str,
        account_id: Optional[str] = None,
        agent_run_id: Optional[str] = None,
        trace=None,
        client=None,
    ):
        """
        Initialize DB hooks.
        
        Args:
            thread_id: Thread identifier
            account_id: User account for billing
            agent_run_id: Agent run identifier
            trace: Langfuse trace object (optional)
            client: Supabase client for billing operations
        """
        self.thread_id = thread_id
        self.account_id = account_id
        self.agent_run_id = agent_run_id or str(uuid.uuid4())
        self.trace = trace
        self.client = client
        
        self._thread_run_id: str = str(uuid.uuid4())
    
    def post_reasoning(self, kwargs: dict, output: Any) -> Any:
        """
        AgentScope post_reasoning hook.
        
        Called after LLM reasoning phase. Handles:
        - Billing for token usage
        - Langfuse tracing
        
        Args:
            kwargs: Hook context (contains agent, memory, etc.)
            output: LLM output (Msg object)
            
        Returns:
            output (unchanged)
        """
        # Handle billing in background (fire-and-forget)
        if hasattr(output, 'usage') and output.usage and self.account_id:
            # Extract model name from output or kwargs
            model = getattr(output, 'model', None) or kwargs.get('model', 'unknown')
            asyncio.create_task(self._handle_billing(output.usage, model))
        
        # Handle Langfuse tracing
        if self.trace:
            asyncio.create_task(self._trace_reasoning(kwargs, output))
        
        return output
    
    def post_acting(self, kwargs: dict, output: Any) -> Any:
        """
        AgentScope post_acting hook.
        
        Called after tool execution. Handles:
        - Langfuse tracing for tool calls
        
        Args:
            kwargs: Hook context (contains tool_name, tool_call_id, etc.)
            output: Tool execution result
            
        Returns:
            output (unchanged)
        """
        # Handle Langfuse tracing for tool execution
        if self.trace:
            asyncio.create_task(self._trace_acting(kwargs, output))
        
        return output
    
    async def _handle_billing(self, usage: Dict[str, Any], model: str = "unknown") -> None:
        """
        Handle billing for LLM usage (fire-and-forget).
        
        Uses billing_integration.deduct_usage() for proper token accounting
        including cache tokens.
        
        Args:
            usage: Token usage information from LLM response
            model: Model name for cost calculation
        """
        try:
            from core.billing.credits.integration import billing_integration
            
            prompt_tokens = int(usage.get('prompt_tokens', 0) or 0)
            completion_tokens = int(usage.get('completion_tokens', 0) or 0)
            
            # Extract cache tokens (Anthropic/OpenAI style)
            cache_read_tokens = int(usage.get('cache_read_input_tokens', 0) or 0)
            if cache_read_tokens == 0:
                cache_read_tokens = int(
                    (usage.get('prompt_tokens_details') or {}).get('cached_tokens', 0) or 0
                )
            
            cache_creation_tokens = int(usage.get('cache_creation_input_tokens', 0) or 0)
            if cache_creation_tokens == 0:
                cache_creation_tokens = int(
                    (usage.get('prompt_tokens_details') or {}).get('cache_creation_tokens', 0) or 0
                )
            
            if prompt_tokens > 0 or completion_tokens > 0:
                deduct_result = await billing_integration.deduct_usage(
                    account_id=self.account_id,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    model=model,
                    message_id=None,  # AgentScope handles message storage separately
                    thread_id=self.thread_id,
                    cache_read_tokens=cache_read_tokens,
                    cache_creation_tokens=cache_creation_tokens,
                )
                
                if deduct_result.get('success'):
                    cost = deduct_result.get('cost', 0)
                    logger.debug(
                        f"Deducted ${cost:.6f}: prompt={prompt_tokens}, "
                        f"completion={completion_tokens}, cache_read={cache_read_tokens}"
                    )
                else:
                    logger.warning(f"Billing deduction failed: {deduct_result}")
                
        except ImportError as e:
            # Billing module not available
            logger.debug(f"Billing module not available: {e}")
        except Exception as e:
            # Fire-and-forget: log but don't fail
            logger.warning(f"Failed to handle billing: {e}")
    
    async def _trace_reasoning(self, kwargs: dict, output: Any) -> None:
        """
        Send reasoning trace to Langfuse.
        
        Args:
            kwargs: Hook context
            output: LLM output
        """
        try:
            if not self.trace:
                return
            
            # Extract content
            content = ""
            if hasattr(output, 'content'):
                content = output.content
            elif isinstance(output, str):
                content = output
            
            # Create generation span
            self.trace.generation(
                name="reasoning",
                input=kwargs.get('messages', []),
                output=content,
                metadata={
                    "thread_id": self.thread_id,
                    "agent_run_id": self.agent_run_id,
                },
            )
            
        except Exception as e:
            logger.debug(f"Failed to trace reasoning: {e}")
    
    async def _trace_acting(self, kwargs: dict, output: Any) -> None:
        """
        Send tool execution trace to Langfuse.
        
        Args:
            kwargs: Hook context
            output: Tool result
        """
        try:
            if not self.trace:
                return
            
            tool_name = kwargs.get('tool_name', 'unknown')
            
            # Create span for tool execution
            self.trace.span(
                name=f"tool:{tool_name}",
                input=kwargs.get('arguments', {}),
                output=str(output)[:1000],  # Truncate long outputs
                metadata={
                    "thread_id": self.thread_id,
                    "agent_run_id": self.agent_run_id,
                    "tool_name": tool_name,
                },
            )
            
        except Exception as e:
            logger.debug(f"Failed to trace acting: {e}")
    
    def set_thread_run_id(self, thread_run_id: str) -> None:
        """Set the thread run ID for this execution."""
        self._thread_run_id = thread_run_id
    
    def set_trace(self, trace) -> None:
        """Set the Langfuse trace object."""
        self.trace = trace
