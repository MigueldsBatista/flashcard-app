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

try:
    from api.modules.exceptions import (
        AIParseException,
        ExtractionFailedException,
        GenerationFailedException,
        MissingConfigException,
        NoContentException,
        RateLimitException,
    )
    from api.modules.schema_parser import GenerationResponse
except ImportError:
    from modules.exceptions import (
        AIParseException,
        ExtractionFailedException,
        GenerationFailedException,
        MissingConfigException,
        NoContentException,
        RateLimitException,
    )
    from modules.schema_parser import GenerationResponse

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


async def call_llm_with_retry(llm, prompt: str, max_retries: int = 3) -> str:
    """Call the LangChain LLM with retry logic for rate limits."""

    prompt_chars = len(prompt)
    estimated_tokens = prompt_chars // 4
    logger.info(
        f"📊 Prompt stats: {prompt_chars} chars, ~{estimated_tokens} estimated tokens"
    )

    for attempt in range(max_retries):
        try:
            message = HumanMessage(content=prompt)
            response = await llm.ainvoke([message])

            response_text = (
                response.content if hasattr(response, "content") else str(response)
            )
            response_chars = len(response_text) if response_text else 0
            logger.info(f"✅ Response received: {response_chars} chars")

            return response_text

        except (
            RateLimitException,
            ExtractionFailedException,
            NoContentException,
            AIParseException,
            GenerationFailedException,
            MissingConfigException,
        ):
            # Let domain exceptions propagate immediately — no retry
            raise

        except Exception as e:
            error_str = str(e)

            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                # Gemini free tier has strict limits (15 RPM). Wait longer.
                wait_time = (attempt + 1) * 15
                logger.warning(
                    f"⚠️ Rate limit hit (attempt {attempt + 1}/{max_retries}). "
                    f"Waiting {wait_time}s..."
                )

                if attempt < max_retries - 1:
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise RateLimitException(
                        "API com muitas requisições. Aguarde alguns segundos e tente novamente.",
                        suggestion="Espere 30 segundos antes de tentar novamente",
                    )
            else:
                raise GenerationFailedException(
                    f"Erro na geração: {e}",
                    suggestion="Tente novamente em alguns instantes",
                )

    raise GenerationFailedException(
        "Falha após múltiplas tentativas",
        suggestion="Tente novamente em alguns instantes",
    )
