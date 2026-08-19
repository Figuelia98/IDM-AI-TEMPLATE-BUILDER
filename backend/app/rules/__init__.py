"""AI Rules and System Prompts Module.

This package contains:
- AI_RULES.md: Comprehensive natural language rules for formatting, design, and implementation
- system_prompts.py: System prompt generation based on chat mode
"""

from app.rules.system_prompts import ChatMode, create_conversation_message, get_extraction_instruction, get_system_prompt

__all__ = [
    "ChatMode",
    "get_system_prompt",
    "get_extraction_instruction",
    "create_conversation_message",
]
