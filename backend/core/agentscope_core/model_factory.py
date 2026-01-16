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


def normalize_model_name_for_agentscope(model_name: str) -> str:
    """
    Normalize frontend / registry model IDs into provider model names that AgentScope can route correctly.

    This is intentionally AgentScope-specific: AgentScope decides provider by model name prefix
    (gemini*/claude*), so registry IDs like "kortix/basic" must be mapped.
    """
    model_lower = (model_name or "").lower()

    # Business aliases / registry IDs → provider model names
    alias_map = {
        # Frontend/registry IDs
        "kortix/basic": "claude-haiku-4-5",
        "kortix/power": "claude-sonnet-4-5",
        "kortix/advanced": "claude-sonnet-4-5",
    }

    return alias_map.get(model_lower, model_name)


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
    
    # Normalize model name so provider routing works correctly
    normalized_model_name = normalize_model_name_for_agentscope(model_name)
    if normalized_model_name != model_name:
        logger.info(f"[AgentScope] Mapped model '{model_name}' -> '{normalized_model_name}'")

    # Determine provider from model name
    model_lower = normalized_model_name.lower()
    
    if model_lower.startswith("gemini"):
        # Google Gemini models
        gemini_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable required")
        
        logger.info(f"Creating GeminiChatModel for {normalized_model_name}")
        return GeminiChatModel(
            model=normalized_model_name,
            api_key=gemini_key,
            stream=stream,
        )
    
    elif model_lower.startswith("claude") or "anthropic" in model_lower:
        # Anthropic Claude models - use native AnthropicChatModel
        anthropic_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not anthropic_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable required")
        
        logger.info(f"Creating AnthropicChatModel for {normalized_model_name}")
        return AnthropicChatModel(
            model_name=normalized_model_name,
            api_key=anthropic_key,
            stream=stream,
        )
    
    else:
        # Default to OpenAI models (gpt-4o, gpt-4-turbo, etc.)
        openai_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not openai_key:
            raise ValueError("OPENAI_API_KEY environment variable required")
        
        logger.info(f"Creating OpenAIChatModel for {normalized_model_name}")
        return OpenAIChatModel(
            model=normalized_model_name,
            api_key=openai_key,
            base_url=base_url,
            stream=stream,
        )

