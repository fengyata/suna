"""
Model factory for creating AgentScope models.

This module provides a factory function to create the appropriate
AgentScope model based on the model name prefix.
"""

import os
from typing import Optional

from agentscope.model import (
    OpenAIChatModel,
    GeminiChatModel,
    AnthropicChatModel,
)

from core.utils.logger import logger


def create_agentscope_model(
    model_name: str,
    stream: bool = True,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
):
    """
    Create an AgentScope model based on the model name prefix.
    
    Args:
        model_name: The model name (e.g., "gpt-4o", "claude-3-opus", "gemini-pro")
        stream: Whether to enable streaming (default: True)
        api_key: Optional API key override
        base_url: Optional base URL override
        
    Returns:
        An AgentScope model instance
    """
    
    # Determine provider from model name
    model_lower = model_name.lower()
    
    if model_lower.startswith("gemini"):
        # Google Gemini models
        gemini_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable required")
        
        logger.info(f"Creating GeminiChatModel for {model_name}")
        return GeminiChatModel(
            model=model_name,
            api_key=gemini_key,
            stream=stream,
        )
    
    elif model_lower.startswith("claude") or "anthropic" in model_lower:
        # Anthropic Claude models - use native AnthropicChatModel
        anthropic_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not anthropic_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable required")
        
        logger.info(f"Creating AnthropicChatModel for {model_name}")
        return AnthropicChatModel(
            model_name=model_name,
            api_key=anthropic_key,
            stream=stream,
        )
    
    else:
        # Default to OpenAI models (gpt-4o, gpt-4-turbo, etc.)
        openai_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("OPENAI_API_KEY environment variable required")
        
        logger.info(f"Creating OpenAIChatModel for {model_name}")
        return OpenAIChatModel(
            model=model_name,
            api_key=openai_key,
            base_url=base_url,
            stream=stream,
        )

