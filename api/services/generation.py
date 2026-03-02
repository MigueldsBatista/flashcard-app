"""
Generation service layer.

Contains business logic for AI-powered flashcard generation:
  - LLM invocation with retry / rate-limit handling
  - AI response parsing and validation
"""

import asyncio
import json
import logging

from langchain_core.messages import HumanMessage
from pydantic import ValidationError

from api.modules.exceptions import (
    AIParseException,
    ExtractionFailedException,
    GenerationFailedException,
    MissingConfigException,
    NoContentException,
    RateLimitException,
)
from api.modules.schema_parser import GenerationResponse

logger = logging.getLogger(__name__)


def parse_ai_response(response_text: str) -> GenerationResponse:
    """Parse and validate AI response JSON."""
    text = response_text.strip()

    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    try:
        data = json.loads(text)
        return GenerationResponse(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        raise AIParseException(
            f"Falha ao processar resposta da IA: {e}",
            suggestion="Tente novamente ou reformule o conteúdo",
        )


async def call_llm_with_retry(require_vision: bool, prompt: str) -> str:
    """Implement failover provider mechanism to handle exact 429 quota exhaustion."""
    from api.modules.ai import get_llm
    import os

    prompt_chars = len(prompt)
    estimated_tokens = prompt_chars // 4
    logger.info(
        f"📊 Prompt stats: {prompt_chars} chars, ~{estimated_tokens} estimated tokens"
    )

    primary_provider = os.environ.get("LLM_PROVIDER", "groq").lower()
    
    # Generate the fallback sequence based on what keys are available
    available_providers = []
    
    # Try pushing primary provider first
    if primary_provider == "gemini" and os.environ.get("GEMINI_API_KEY"):
        available_providers.append("gemini")
    elif primary_provider == "openai" and os.environ.get("OPENAI_API_KEY"):
        available_providers.append("openai")
    elif primary_provider == "groq" and os.environ.get("GROQ_API_KEY"):
        available_providers.append("groq")

    # Push fallbacks
    if "groq" not in available_providers and os.environ.get("GROQ_API_KEY"):
        available_providers.append("groq")
    if "gemini" not in available_providers and os.environ.get("GEMINI_API_KEY"):
        available_providers.append("gemini")
    if "openai" not in available_providers and os.environ.get("OPENAI_API_KEY"):
        available_providers.append("openai")

    if not available_providers:
        # Fallback to the default error handling of get_llm which raises MissingConfigException
        available_providers = [primary_provider]

    last_error = None

    for provider in available_providers:
        try:
            logger.info(f"🔄 Attempting LLM request using provider: {provider}")
            llm = get_llm(require_vision=require_vision, override_provider=provider)
            message = HumanMessage(content=prompt)
            
            response = await llm.ainvoke([message])

            response_text = (
                response.content if hasattr(response, "content") else str(response)
            )
            response_chars = len(response_text) if response_text else 0
            logger.info(f"✅ Response received via {provider}: {response_chars} chars")

            return response_text

        except (
            ExtractionFailedException,
            NoContentException,
            AIParseException,
            MissingConfigException,
        ):
            # Let domain exceptions propagate immediately
            raise

        except Exception as e:
            error_str = str(e)

            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                logger.warning(
                    f"⚠️ Rate limit hit with {provider}. Failing over to next."
                )
                last_error = e
                continue
            else:
                logger.error(f"❌ Unexpected error from {provider}: {error_str}. Failing over.")
                last_error = e
                continue

    # If we exhausted all fallback providers, raise RateLimitException
    if last_error:
        error_str = str(last_error)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            raise RateLimitException(
                "API com muitas requisições simultâneas.",
                suggestion="Os provedores de IA estão no limite de capacidade. Tente novamente em alguns segundos.",
            )
        else:
            raise GenerationFailedException(
                f"Falha na geração (último erro: {last_error})",
                suggestion="Tente novamente ou limpe os caches",
            )
    
    raise GenerationFailedException(
        "Nenhum provedor disponível processou a requisição",
        suggestion="Verifique as configurações e chaves de API",
    )
