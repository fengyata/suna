"""
Expand Message Adapter for AgentScope.

Implements the expand_message tool for viewing full content of compressed messages.
This is a standalone implementation that reads directly from Supabase,
independent of ThreadManager.
"""

import json
from typing import Optional

from agentscope.tool import Toolkit, ToolResponse
from agentscope.message import TextBlock

from core.utils.logger import logger


class ExpandMessageAdapter:
    """
    Adapter for registering expand_message tool with AgentScope Toolkit.
    
    The expand_message tool allows agents to retrieve the full content
    of messages that were compressed during context management.
    """
    
    def __init__(
        self,
        toolkit: Toolkit,
        thread_id: str,
        supabase_client=None,
    ):
        """
        Initialize expand message adapter.
        
        Args:
            toolkit: AgentScope Toolkit to register with
            thread_id: Thread ID for message lookup
            supabase_client: Supabase client for DB operations
        """
        self.toolkit = toolkit
        self.thread_id = thread_id
        self.client = supabase_client
    
    def register_tools(self) -> None:
        """Register expand_message with the toolkit."""
        
        @self.toolkit.register_tool
        async def expand_message(message_id: str) -> ToolResponse:
            """
            Expand a message from the previous conversation with the user.
            
            Use this tool to view the full content of a message that was
            truncated or compressed in earlier conversation.
            
            Args:
                message_id: The ID of the message to expand. Must be a UUID.
            
            Returns:
                ToolResponse with the full message content
            """
            return await self._expand_message_impl(message_id)
        
        logger.info("[EXPAND] Registered expand_message tool")
    
    async def _expand_message_impl(self, message_id: str) -> ToolResponse:
        """
        Implementation of expand_message.
        
        Args:
            message_id: UUID of the message to expand
            
        Returns:
            ToolResponse with full message content
        """
        if not self.client:
            return ToolResponse(
                content=[TextBlock(text="Error: Database client not available")],
                metadata={"error": True},
            )
        
        if not message_id:
            return ToolResponse(
                content=[TextBlock(text="Error: message_id is required")],
                metadata={"error": True},
            )
        
        try:
            # Query message from database
            result = await self.client.table('messages')\
                .select('*')\
                .eq('message_id', message_id)\
                .eq('thread_id', self.thread_id)\
                .execute()
            
            if not result.data or len(result.data) == 0:
                return ToolResponse(
                    content=[TextBlock(
                        text=f"Message with ID {message_id} not found in thread {self.thread_id}"
                    )],
                    metadata={"error": True},
                )
            
            message_data = result.data[0]
            message_content = message_data.get('content')
            
            # Extract content from various formats
            final_content = self._extract_content(message_content)
            
            return ToolResponse(
                content=[TextBlock(text=final_content)],
                metadata={
                    "message_id": message_id,
                    "role": message_data.get('role'),
                    "type": message_data.get('type'),
                },
            )
            
        except Exception as e:
            logger.error(f"[EXPAND] Error expanding message {message_id}: {e}", exc_info=True)
            return ToolResponse(
                content=[TextBlock(text=f"Error expanding message: {str(e)}")],
                metadata={"error": True},
            )
    
    def _extract_content(self, message_content) -> str:
        """
        Extract the actual content from various message formats.
        
        Args:
            message_content: Raw content from database
            
        Returns:
            Extracted content string
        """
        if message_content is None:
            return ""
        
        # Handle dict with 'content' key
        if isinstance(message_content, dict):
            if 'content' in message_content:
                return str(message_content['content'])
            return json.dumps(message_content, indent=2)
        
        # Handle string (may be JSON)
        if isinstance(message_content, str):
            try:
                parsed = json.loads(message_content)
                if isinstance(parsed, dict) and 'content' in parsed:
                    return str(parsed['content'])
                return json.dumps(parsed, indent=2)
            except json.JSONDecodeError:
                return message_content
        
        # Default: convert to string
        return str(message_content)

