"""
Supabase Memory Implementation for AgentScope.

This memory implementation integrates with Supabase for message persistence
and fully supports AgentScope's memory compression mechanism.

Key features:
- Implements all MemoryBase abstract methods with correct async signatures
- Persists messages to DB on add() for data safety
- Supports marks mechanism for compression tracking
- Stores compression summary in dedicated table
- Loads history including compression state on initialization
"""

import uuid
import json
from typing import List, Dict, Any, Optional, Tuple, Union

from agentscope.memory import MemoryBase
from agentscope.message import Msg

from core.utils.logger import logger


class SupabaseMemory(MemoryBase):
    """
    Custom memory implementation that integrates with Supabase.
    
    Implements AgentScope's MemoryBase interface with full support for:
    - Message persistence to Supabase
    - AgentScope's compression mechanism (marks, summary)
    - Memory context injection (user memories, file content)
    - Respects is_llm_message flag for billing
    """
    
    def __init__(
        self,
        thread_id: str,
        client=None,
        memory_context: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize SupabaseMemory.
        
        Args:
            thread_id: Thread identifier for message retrieval
            client: Supabase client
            memory_context: Additional context to inject (user memories, file content)
        """
        super().__init__()
        self.thread_id = thread_id
        self.client = client
        self.memory_context = memory_context or {}
        
        # Internal message storage: List of (Msg, marks) tuples
        # This matches AgentScope's InMemoryMemory structure
        self.content: List[Tuple[Msg, List[str]]] = []
        
        # Compressed summary storage
        self._compressed_summary: str = ""
        
        # Track message_id mapping for DB operations
        self._msg_to_db_id: Dict[int, str] = {}  # msg index -> message_id
    
    async def load_history(self) -> None:
        """
        Load message history from Supabase.
        
        Loads:
        1. Compression summary (if exists)
        2. Non-compressed messages (is_compressed=FALSE)
        """
        if not self.client:
            logger.warning("No Supabase client provided, skipping history load")
            return
        
        try:
            # 1. Load compression summary
            await self._load_compression_summary()
            
            # 2. Load non-compressed messages
            await self._load_messages()
            
            logger.info(
                f"Loaded {len(self.content)} messages from thread {self.thread_id}"
                f"{' (with summary)' if self._compressed_summary else ''}"
            )
            
        except Exception as e:
            logger.error(f"Failed to load message history: {e}")
    
    async def _load_compression_summary(self) -> None:
        """Load compression summary from thread_compression_summaries table."""
        try:
            result = await self.client.table('thread_compression_summaries')\
                .select('summary')\
                .eq('thread_id', self.thread_id)\
                .maybe_single()\
                .execute()
            
            if result.data:
                self._compressed_summary = result.data.get('summary', '')
                logger.debug(f"Loaded compression summary: {len(self._compressed_summary)} chars")
        except Exception as e:
            logger.warning(f"Failed to load compression summary: {e}")
    
    async def _load_messages(self) -> None:
        """Load non-compressed messages from messages table."""
        try:
            # Only load messages where is_compressed = FALSE
            result = await self.client.table('messages')\
                .select('*')\
                .eq('thread_id', self.thread_id)\
                .eq('is_llm_message', True)\
                .eq('is_compressed', False)\
                .order('created_at')\
                .execute()
            
            for idx, item in enumerate(result.data or []):
                msg = self._convert_db_message_to_msg(item)
                if msg:
                    self.content.append((msg, []))  # No marks for loaded messages
                    self._msg_to_db_id[idx] = item.get('message_id')
                    
        except Exception as e:
            logger.error(f"Failed to load messages: {e}")
    
    def _convert_db_message_to_msg(self, item: Dict[str, Any]) -> Optional[Msg]:
        """
        Convert a Supabase message record to AgentScope Msg.
        
        Converts native format (from DB) to AgentScope format.
        
        Native format:
            content = {
                "role": "assistant",
                "content": "Hello",
                "tool_calls": [{"id": "...", "type": "function", "function": {...}}]
            }
        
        AgentScope format (for tool calls):
            content = [
                {"text": "Hello"},
                {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
            ]
        """
        msg_type = item.get('type')
        content_raw = item.get('content', '{}')
        metadata_raw = item.get('metadata', '{}')
        message_id = item.get('message_id')
        
        try:
            content = json.loads(content_raw) if isinstance(content_raw, str) else content_raw
            metadata = json.loads(metadata_raw) if isinstance(metadata_raw, str) else metadata_raw
        except json.JSONDecodeError:
            content = {"content": content_raw}
            metadata = {}
        
        # Map message types to roles
        role_mapping = {
            'user': 'user',
            'assistant': 'assistant',
            'tool': 'tool',
            'system': 'system',
        }
        
        role = role_mapping.get(msg_type, 'user')
        
        # Build Msg metadata
        msg_metadata = {"message_id": message_id} if message_id else {}
        
        # Handle tool messages (tool response)
        # AgentScope only supports role in ["user", "assistant", "system"]
        # Tool results are represented as role='user' with ToolResultBlock content
        if msg_type == 'tool':
            tool_call_id = content.get('tool_call_id') or metadata.get('tool_call_id')
            text_content = content.get('content', '') if isinstance(content, dict) else str(content)
            
            # Build AgentScope format: role='user' with ToolResultBlock
            tool_result_block = {
                "type": "tool_result",
                "tool_use_id": tool_call_id,
                "content": text_content
            }
            
            return Msg(
                name="tool",  # name can be anything
                content=[tool_result_block],
                role="user",  # AgentScope requires user/assistant/system
                metadata=msg_metadata,
            )
        
        # Handle assistant messages with tool_calls - convert to ContentBlock format
        if msg_type == 'assistant' and isinstance(content, dict) and content.get('tool_calls'):
            text_content = content.get('content', '')
            tool_calls = content.get('tool_calls', [])
            
            # Build ContentBlock list for AgentScope
            content_blocks = []
            
            # Add text block if there's text content
            if text_content:
                content_blocks.append({"text": text_content})
            
            # Convert native tool_calls to AgentScope ToolUseBlock format
            for tc in tool_calls:
                tool_use_block = {
                    "type": "tool_use",
                    "id": tc.get('id', ''),
                    "name": tc.get('function', {}).get('name', ''),
                    "input": self._parse_tool_arguments(tc.get('function', {}).get('arguments', '{}'))
                }
                content_blocks.append(tool_use_block)
            
            return Msg(
                name=role,
                content=content_blocks if content_blocks else text_content,
                role=role,
                metadata=msg_metadata,
            )
        
        # Handle regular messages (no tool_calls)
        text_content = content.get('content', '') if isinstance(content, dict) else str(content)
        
        return Msg(
            name=role,
            content=text_content,
            role=role,
            metadata=msg_metadata,
        )
    
    def _parse_tool_arguments(self, arguments: Union[str, dict]) -> dict:
        """Parse tool arguments from string or dict."""
        if isinstance(arguments, dict):
            return arguments
        if isinstance(arguments, str):
            try:
                return json.loads(arguments)
            except json.JSONDecodeError:
                return {"raw": arguments}
        return {}
    
    def _determine_message_type(self, msg: Msg, native_content: Dict[str, Any]) -> str:
        """
        Determine the database message_type based on message content.
        
        AgentScope only supports role in ["user", "assistant", "system"],
        but we need to save tool responses as type='tool' for frontend.
        
        Detection logic:
        - If native_content has 'tool_call_id' -> type='tool'
        - If native_content has 'tool_calls' -> type='assistant'  
        - Otherwise use msg.role directly
        """
        # Tool response: has tool_call_id
        if native_content.get('tool_call_id'):
            return 'tool'
        
        # Assistant with tool calls
        if native_content.get('tool_calls'):
            return 'assistant'
        
        # Direct role mapping
        return msg.role
    
    # ============================================================
    # AgentScope MemoryBase Abstract Methods
    # ============================================================
    
    async def add(
        self,
        memories: Union[Msg, List[Msg], None],
        marks: Union[str, List[str], None] = None,
        **kwargs: Any,
    ) -> None:
        """
        Add message(s) to memory and persist to DB.
        
        This is called automatically by ReActAgent after:
        - User input
        - LLM response
        - Tool execution result
        
        Args:
            memories: Message(s) to add
            marks: Optional marks (e.g., "COMPRESSED", "HINT")
        """
        if memories is None:
            return
        
        # Normalize to list
        msgs = [memories] if isinstance(memories, Msg) else memories
        marks_list = [marks] if isinstance(marks, str) else (marks or [])
        
        for msg in msgs:
            # 1. Save to DB first (ensures data safety)
            message_id = await self._save_message_to_db(msg, marks_list)
            
            # 2. Add to internal memory
            idx = len(self.content)
            self.content.append((msg, list(marks_list)))
            
            # 3. Track message_id mapping
            if message_id:
                self._msg_to_db_id[idx] = message_id
                # Also store in Msg metadata for later reference
                if not hasattr(msg, 'metadata') or msg.metadata is None:
                    msg.metadata = {}
                msg.metadata["message_id"] = message_id
            
            logger.debug(f"Added message: role={msg.role}, marks={marks_list}")
    
    async def _save_message_to_db(
        self, 
        msg: Msg, 
        marks: List[str],
    ) -> Optional[str]:
        """
        Save a message to the messages table.
        
        Converts AgentScope Msg format to native format for frontend compatibility.
        
        AgentScope format (content may be list of ContentBlocks):
            content = [
                {"text": "Hello"},
                {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
            ]
        
        Native format (frontend expects):
            content = {
                "role": "assistant",
                "content": "Hello",  # string
                "tool_calls": [
                    {"id": "...", "type": "function", "function": {"name": "...", "arguments": "{...}"}}
                ]
            }
        """
        if not self.client:
            return None
        
        try:
            from core.threads import repo as threads_repo
            
            # Convert AgentScope content to native format
            content = self._convert_msg_content_to_native(msg)
            
            # Determine actual message_type based on content
            # AgentScope uses role='user' for tool results, but DB expects type='tool'
            message_type = self._determine_message_type(msg, content)
            
            # Build metadata
            metadata = {
                "marks": marks,
            }
            if hasattr(msg, 'metadata') and msg.metadata:
                metadata.update(msg.metadata)
            
            # Determine is_compressed from marks
            is_compressed = "COMPRESSED" in marks
            
            # Insert to DB and get the actual message_id from result
            result = await threads_repo.insert_message(
                thread_id=self.thread_id,
                message_type=message_type,
                content=content,
                is_llm_message=True,
                metadata=metadata,
            )
            
            if not result:
                logger.error("insert_message returned None")
                return None
            
            # Use the actual message_id from DB (not a locally generated one)
            message_id = result.get('message_id')
            
            # If compressed, update the is_compressed field with the correct ID
            if is_compressed and message_id:
                await self._update_message_compressed_flag(message_id, True)
            
            return message_id
            
        except Exception as e:
            logger.error(f"Failed to save message to DB: {e}")
            return None
    
    async def delete(
        self,
        msg_ids: List[str],
        **kwargs: Any,
    ) -> int:
        """
        Delete messages by their IDs.
        
        Note: AgentScope's compression uses marks instead of deletion,
        so this is rarely called.
        
        Args:
            msg_ids: List of message IDs to delete
            
        Returns:
            Number of messages deleted
        """
        deleted = 0
        
        # Remove from internal memory
        new_content = []
        for idx, (msg, marks) in enumerate(self.content):
            msg_id = self._msg_to_db_id.get(idx)
            if msg_id not in msg_ids:
                new_content.append((msg, marks))
            else:
                deleted += 1
        
        self.content = new_content
        
        # Rebuild index mapping
        self._msg_to_db_id = {
            i: self._msg_to_db_id.get(old_idx)
            for i, (old_idx, _) in enumerate(
                (idx, item) for idx, item in enumerate(self.content)
            )
            if old_idx in self._msg_to_db_id
        }
        
        logger.debug(f"Deleted {deleted} messages from memory")
        return deleted
    
    async def size(self) -> int:
        """Return the number of messages in memory."""
        return len(self.content)
    
    async def clear(self) -> None:
        """Clear all messages from memory."""
        self.content = []
        self._msg_to_db_id = {}
        self._compressed_summary = ""
        logger.debug("Cleared all messages from memory")
    
    async def get_memory(
        self,
        mark: Optional[str] = None,
        exclude_mark: Optional[str] = None,
        prepend_summary: bool = True,
        **kwargs: Any,
    ) -> List[Msg]:
        """
        Get messages from memory with filtering and summary prepending.
        
        This is called automatically by ReActAgent before each LLM call.
        
        Args:
            mark: Only return messages with this mark
            exclude_mark: Exclude messages with this mark (e.g., "COMPRESSED")
            prepend_summary: Whether to prepend compression summary
            
        Returns:
            List of Msg objects for LLM context
        """
        messages = []
        
        # Filter messages by marks
        for msg, marks in self.content:
            # Filter by mark (include only)
            if mark and mark not in marks:
                continue
            # Filter by exclude_mark
            if exclude_mark and exclude_mark in marks:
                continue
            messages.append(msg)
        
        # Prepend compression summary if available
        if prepend_summary and self._compressed_summary:
            summary_msg = Msg(
                name="user",
                content=self._compressed_summary,
                role="user",
            )
            messages = [summary_msg] + messages
        
        # Inject memory_context if available
        if self.memory_context:
            messages = self._inject_memory_context(messages)
        
        return messages
    
    def _inject_memory_context(self, messages: List[Msg]) -> List[Msg]:
        """Inject memory_context (user memories, file content) into messages."""
        context_parts = []
        
        if self.memory_context.get('user_memories'):
            memories = self.memory_context['user_memories']
            context_parts.append(f"<user_memories>\n{memories}\n</user_memories>")
        
        if self.memory_context.get('file_content'):
            file_content = self.memory_context['file_content']
            context_parts.append(f"<file_context>\n{file_content}\n</file_context>")
        
        if context_parts:
            context_msg = Msg(
                name="system",
                content="\n\n".join(context_parts),
                role="system",
            )
            # Insert after system prompt but before other messages
            if messages and messages[0].role == "system":
                messages = [messages[0], context_msg] + messages[1:]
            else:
                messages = [context_msg] + messages
        
        return messages
    
    # ============================================================
    # AgentScope Compression Support Methods
    # ============================================================
    
    async def update_compressed_summary(self, summary: str) -> None:
        """
        Update the compression summary.
        
        Called by ReActAgent when memory compression occurs.
        Saves to both memory and DB.
        
        Args:
            summary: The LLM-generated summary of compressed messages
        """
        # Update in memory
        self._compressed_summary = summary
        
        # Persist to DB
        await self._save_summary_to_db(summary)
        
        logger.info(f"Updated compression summary: {len(summary)} chars")
    
    async def _save_summary_to_db(self, summary: str) -> None:
        """Save compression summary to thread_compression_summaries table."""
        if not self.client:
            return
        
        try:
            # Count compressed messages
            compressed_count = sum(
                1 for _, marks in self.content if "COMPRESSED" in marks
            )
            
            # Upsert summary
            await self.client.table('thread_compression_summaries')\
                .upsert({
                    'thread_id': self.thread_id,
                    'summary': summary,
                    'compressed_message_count': compressed_count,
                }, on_conflict='thread_id')\
                .execute()
                
        except Exception as e:
            logger.error(f"Failed to save compression summary: {e}")
    
    async def update_messages_mark(
        self,
        msg_ids: List[str],
        mark: str,
    ) -> None:
        """
        Add a mark to specified messages.
        
        Called by ReActAgent when marking messages as COMPRESSED.
        
        Args:
            msg_ids: List of message IDs to mark
            mark: Mark to add (e.g., "COMPRESSED")
        """
        # Update in memory
        for idx, (msg, marks) in enumerate(self.content):
            msg_id = self._msg_to_db_id.get(idx)
            if msg_id in msg_ids and mark not in marks:
                marks.append(mark)
        
        # Update in DB (set is_compressed=TRUE for COMPRESSED mark)
        if mark == "COMPRESSED":
            await self._update_messages_compressed_flag(msg_ids, True)
        
        logger.debug(f"Marked {len(msg_ids)} messages with '{mark}'")
    
    async def _update_messages_compressed_flag(
        self, 
        msg_ids: List[str], 
        is_compressed: bool,
    ) -> None:
        """Update is_compressed flag for multiple messages."""
        if not self.client or not msg_ids:
            return
        
        try:
            await self.client.table('messages')\
                .update({'is_compressed': is_compressed})\
                .in_('message_id', msg_ids)\
                .execute()
        except Exception as e:
            logger.error(f"Failed to update is_compressed flag: {e}")
    
    async def _update_message_compressed_flag(
        self,
        message_id: str,
        is_compressed: bool,
    ) -> None:
        """Update is_compressed flag for a single message."""
        await self._update_messages_compressed_flag([message_id], is_compressed)
    
    # ============================================================
    # Format Conversion Methods (AgentScope <-> Native)
    # ============================================================
    
    def _convert_msg_content_to_native(self, msg: Msg) -> Dict[str, Any]:
        """
        Convert AgentScope Msg content to native format for DB storage.
        
        This ensures frontend can correctly display messages.
        
        AgentScope ContentBlock list -> Native dict with tool_calls array
        """
        content_value = msg.content
        
        # Case 1: content is already a string
        if isinstance(content_value, str):
            native_content = {
                "role": msg.role,
                "content": content_value,
            }
            # Check for tool_call_id (tool response message)
            if hasattr(msg, 'tool_call_id') and msg.tool_call_id:
                native_content["tool_call_id"] = msg.tool_call_id
            return native_content
        
        # Case 2: content is a list (ContentBlocks or dicts)
        if isinstance(content_value, list):
            text_parts = []
            tool_calls = []
            tool_call_id = None
            
            for block in content_value:
                # Handle dict representation of ContentBlock
                if isinstance(block, dict):
                    # TextBlock: {"text": "..."}
                    if 'text' in block:
                        text_parts.append(block['text'])
                    
                    # ToolUseBlock: {"type": "tool_use", "id": "...", "name": "...", "input": {...}}
                    elif block.get('type') == 'tool_use':
                        tool_call = {
                            "id": block.get('id', ''),
                            "type": "function",
                            "function": {
                                "name": block.get('name', ''),
                                "arguments": json.dumps(block.get('input', {}), ensure_ascii=False)
                            }
                        }
                        tool_calls.append(tool_call)
                    
                    # ToolResultBlock: {"type": "tool_result", "tool_use_id": "...", ...}
                    elif block.get('type') == 'tool_result':
                        tool_call_id = block.get('tool_use_id')
                        if 'content' in block:
                            text_parts.append(str(block['content']))
                
                # Handle actual ContentBlock objects (fallback)
                elif hasattr(block, 'text'):
                    text_parts.append(block.text)
                elif hasattr(block, 'name') and hasattr(block, 'input'):
                    # ToolUseBlock object
                    tool_call = {
                        "id": getattr(block, 'id', ''),
                        "type": "function",
                        "function": {
                            "name": block.name,
                            "arguments": json.dumps(block.input, ensure_ascii=False)
                        }
                    }
                    tool_calls.append(tool_call)
            
            # Build native format
            native_content = {
                "role": msg.role,
                "content": "".join(text_parts),
            }
            
            if tool_calls:
                native_content["tool_calls"] = tool_calls
            
            if tool_call_id:
                native_content["tool_call_id"] = tool_call_id
            
            return native_content
        
        # Case 3: content is a dict (already native-like format)
        if isinstance(content_value, dict):
            native_content = {
                "role": msg.role,
                "content": content_value.get('content', ''),
            }
            if 'tool_calls' in content_value:
                native_content["tool_calls"] = content_value['tool_calls']
            if 'tool_call_id' in content_value:
                native_content["tool_call_id"] = content_value['tool_call_id']
            return native_content
        
        # Fallback: convert to string
        return {
            "role": msg.role,
            "content": str(content_value),
        }
    
    # ============================================================
    # Utility Methods
    # ============================================================
    
    def get_message_id(self, index: int) -> Optional[str]:
        """Get the database message_id for a message at the given index."""
        return self._msg_to_db_id.get(index)
    
    def get_all_message_ids(self) -> List[str]:
        """Get all message IDs in order."""
        return [
            self._msg_to_db_id.get(i)
            for i in range(len(self.content))
            if i in self._msg_to_db_id
        ]
