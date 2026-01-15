"""
Custom compression schema for AgentScope.

This module defines the compression schema that preserves message_ids
for the expand_message tool to work correctly.
"""

from pydantic import BaseModel, Field
from typing import List


class SunaCompressedSummary(BaseModel):
    """
    Custom summary schema that preserves message_ids for expand_message tool.
    
    When AgentScope compresses multiple messages into a summary, this schema
    ensures that the original message_ids are preserved. Users can then use
    the expand_message tool to view the full content of any compressed message.
    """
    
    task_overview: str = Field(
        max_length=500,
        description="Overview of the conversation task and goals"
    )
    key_points: str = Field(
        max_length=800,
        description="Important decisions, discoveries, and context from the conversation"
    )
    pending_actions: str = Field(
        max_length=300,
        description="Actions that remain to be done"
    )
    compressed_message_ids: List[str] = Field(
        description="List of message_ids that were compressed into this summary. "
                    "Extract message_id from each message's metadata."
    )


# Summary template for formatting the compressed summary
# Uses placeholders that match the SunaCompressedSummary fields
SUNA_SUMMARY_TEMPLATE = """<compressed_context>
Task Overview:
{task_overview}

Key Points:
{key_points}

Pending Actions:
{pending_actions}

---
To view full content of compressed messages, use expand_message tool with these IDs:
{compressed_message_ids}
</compressed_context>"""


# Compression prompt that guides the LLM on how to generate the summary
SUNA_COMPRESSION_PROMPT = """You are a conversation summarizer. Summarize the following conversation messages concisely while preserving all important context.

CRITICAL REQUIREMENTS:
1. Extract the main task/goal from the conversation
2. List all important decisions, discoveries, and context
3. Note any pending actions or next steps
4. MOST IMPORTANT: You MUST include ALL message_ids from the messages in the compressed_message_ids field

For each message, look for its message_id in the metadata and include it in your response.
The user needs these IDs to expand and view the full content of compressed messages later."""

