"""
Streaming Hooks for AgentScope.

Handles streaming content to the frontend via async queue.

Hook signatures (AgentScope):
- Pre-hook: (self, kwargs: dict) -> dict | None
- Post-hook: (self, kwargs: dict, output: Any) -> Any | None
"""

import json
import uuid
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from core.utils.logger import logger


class StreamingHooks:
    """
    Hooks for streaming content to the frontend.
    
    Implements AgentScope's hook interface and streams:
    - Assistant content (cumulative chunks)
    - Tool execution status
    - Reasoning/thinking content
    - Status messages (processing, complete, error)
    """
    
    def __init__(
        self,
        thread_id: str,
        agent_run_id: Optional[str] = None,
        stream_queue: Optional[asyncio.Queue] = None,
        memory=None,
    ):
        """
        Initialize streaming hooks.
        
        Args:
            thread_id: Thread identifier
            agent_run_id: Agent run identifier for streaming
            stream_queue: Async queue for sending messages to frontend
            memory: SupabaseMemory instance for accessing message IDs
        """
        self.thread_id = thread_id
        self.agent_run_id = agent_run_id or str(uuid.uuid4())
        self.stream_queue = stream_queue
        self.memory = memory
        
        self._thread_run_id: str = str(uuid.uuid4())
        self._sequence: int = 0
        
        # Track current assistant message ID for linking tool results
        # This is populated after memory.add() stores the assistant message
        self._current_assistant_message_id: Optional[str] = None
    
    def post_reasoning(self, kwargs: dict, output: Any) -> Any:
        """
        AgentScope post_reasoning hook.
        
        Called after LLM reasoning. Streams assistant content to frontend.
        
        Args:
            kwargs: Hook context
            output: LLM output (Msg object with cumulative content)
            
        Returns:
            output (unchanged)
        """
        if not self.stream_queue:
            return output
        
        # Extract content and stream
        content = ""
        reasoning_content = None
        
        if hasattr(output, 'content'):
            content = output.content
        elif isinstance(output, str):
            content = output
        
        # Check for thinking/reasoning content
        if hasattr(output, 'thinking'):
            reasoning_content = output.thinking
        elif hasattr(output, 'reasoning_content'):
            reasoning_content = output.reasoning_content
        
        # Stream reasoning content first if present
        if reasoning_content:
            message = self._format_message(
                msg_type="reasoning",
                content={"content": reasoning_content},
                metadata={"stream_status": "chunk"},
                is_llm_message=False,
            )
            self._put_nowait(message)
        
        # NOTE: message_id is not available here yet - it's set in memory.add()
        # which happens AFTER this hook. We'll get it in post_acting instead.
        
        # Stream assistant content (cumulative)
        message = self._format_message(
            msg_type="assistant",
            content={"role": "assistant", "content": content},
            metadata={"stream_status": "chunk"},
            is_llm_message=True,
        )
        self._put_nowait(message)
        
        return output
    
    def post_acting(self, kwargs: dict, output: Any) -> Any:
        """
        AgentScope post_acting hook.
        
        Called after tool execution. Streams tool result to frontend.
        
        Args:
            kwargs: Hook context (contains tool_name, tool_call_id, etc.)
            output: Tool execution result
            
        Returns:
            output (unchanged)
        """
        if not self.stream_queue:
            return output
        
        tool_name = kwargs.get('tool_name', 'unknown')
        tool_call_id = kwargs.get('tool_call_id', str(uuid.uuid4()))
        
        # Get assistant_message_id from memory (set during memory.add after post_reasoning)
        # The last assistant message in memory should have the message_id we need
        if not self._current_assistant_message_id and self.memory:
            try:
                # Find the last assistant message's ID from memory
                for idx in range(len(self.memory.content) - 1, -1, -1):
                    msg, marks = self.memory.content[idx]
                    if hasattr(msg, 'role') and msg.role == 'assistant':
                        msg_id = self.memory.get_message_id(idx)
                        if msg_id:
                            self._current_assistant_message_id = msg_id
                            break
            except Exception as e:
                logger.debug(f"Could not get assistant_message_id from memory: {e}")
        
        # Determine status
        status = "success"
        if hasattr(output, 'success') and not output.success:
            status = "error"
        
        # Format result
        result_content = ""
        if hasattr(output, 'output'):
            result_content = str(output.output)
        elif isinstance(output, str):
            result_content = output
        else:
            result_content = str(output)
        
        content = {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": result_content,
        }
        
        metadata = {
            "tool_execution": {
                "tool_name": tool_name,
                "tool_call_id": tool_call_id,
                "status": status,
            },
        }
        
        # Add assistant_message_id for frontend grouping
        if self._current_assistant_message_id:
            metadata["assistant_message_id"] = self._current_assistant_message_id
        
        message = self._format_message(
            msg_type="tool",
            content=content,
            metadata=metadata,
            is_llm_message=True,
        )
        self._put_nowait(message)
        
        return output
    
    def stream_status(
        self,
        status_type: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Stream status message to frontend.
        
        Args:
            status_type: Type of status ('processing', 'finish', 'error', 'agent_status')
            details: Additional status details
        """
        if not self.stream_queue:
            return
        
        content = {
            "status_type": status_type,
            **(details or {}),
        }
        
        message = self._format_message(
            msg_type="status",
            content=content,
            is_llm_message=False,
        )
        self._put_nowait(message)
    
    def stream_llm_ttft(self, time_ms: float) -> None:
        """
        Stream LLM time-to-first-token metric.
        
        Args:
            time_ms: Time to first token in milliseconds
        """
        if not self.stream_queue:
            return
        
        content = {"time_ms": time_ms}
        
        message = self._format_message(
            msg_type="llm_ttft",
            content=content,
            is_llm_message=False,
        )
        self._put_nowait(message)
    
    def stream_tool_started(
        self,
        tool_name: str,
        tool_call_id: str,
        arguments: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Stream tool execution started event.
        
        Args:
            tool_name: Name of the tool being executed
            tool_call_id: Tool call identifier
            arguments: Tool arguments
        """
        if not self.stream_queue:
            return
        
        content = {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "name": tool_name,
        }
        
        metadata = {
            "tool_execution": {
                "tool_name": tool_name,
                "tool_call_id": tool_call_id,
                "arguments": arguments or {},
                "status": "running",
            },
        }
        
        message = self._format_message(
            msg_type="tool",
            content=content,
            metadata=metadata,
            is_llm_message=False,
        )
        self._put_nowait(message)
    
    def _format_message(
        self,
        msg_type: str,
        content: Any,
        metadata: Optional[Dict[str, Any]] = None,
        is_llm_message: bool = True,
    ) -> Dict[str, Any]:
        """
        Format a message for frontend streaming.
        
        Args:
            msg_type: Message type ('assistant', 'tool', 'status', etc.)
            content: Message content
            metadata: Additional metadata
            is_llm_message: Whether this is visible to LLM
            
        Returns:
            Formatted message dict
        """
        now = datetime.now(timezone.utc).isoformat()
        
        message = {
            "sequence": self._sequence,
            "message_id": None,  # Will be set after DB save
            "thread_id": self.thread_id,
            "type": msg_type,
            "is_llm_message": is_llm_message,
            "content": json.dumps(content) if not isinstance(content, str) else content,
            "metadata": json.dumps({
                "thread_run_id": self._thread_run_id,
                "agent_run_id": self.agent_run_id,
                **(metadata or {}),
            }),
            "created_at": now,
            "updated_at": now,
        }
        
        self._sequence += 1
        return message
    
    def _put_nowait(self, message: Dict[str, Any]) -> None:
        """
        Put message on stream queue without blocking.
        
        Args:
            message: Message to send
        """
        try:
            if self.stream_queue:
                self.stream_queue.put_nowait(message)
        except asyncio.QueueFull:
            logger.warning("Stream queue full, dropping message")
    
    def set_thread_run_id(self, thread_run_id: str) -> None:
        """Set the thread run ID for this execution."""
        self._thread_run_id = thread_run_id
    
    def reset_sequence(self) -> None:
        """Reset the sequence counter."""
        self._sequence = 0
