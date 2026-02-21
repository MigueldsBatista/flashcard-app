"""
Flashcard AI Generation API
FastAPI backend for AI-powered flashcard generation.
"""

import os
import json
import logging
import asyncio
from dotenv import load_dotenv
# Load environment variables from root .env file
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from pydantic import ValidationError

try:
    from api.modules.vision_engine import extract_text
    from api.modules.toon_formatter import (
        format_generation_prompt,
        truncate_if_needed
    )
    from api.modules.schema_parser import (
        GenerationResponse,
        GenerationError,
        GeneratedCard,
        CardContent
    )
    from api.modules.exceptions import (
        setup_exception_handlers,
        RateLimitException,
        ExtractionFailedException,
        NoContentException,
        AIParseException,
        GenerationFailedException,
        MissingConfigException,
    )
    from api.modules.ai import get_llm
except ImportError:
    from modules.vision_engine import extract_text
    from modules.toon_formatter import (
        format_generation_prompt,
        truncate_if_needed
    )
    from modules.schema_parser import (
        GenerationResponse,
        GenerationError,
        GeneratedCard,
        CardContent
    )
    from modules.exceptions import (
        setup_exception_handlers,
        RateLimitException,
        ExtractionFailedException,
        NoContentException,
        AIParseException,
        GenerationFailedException,
        MissingConfigException,
    )
    from modules.ai import get_llm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Flashcard AI API",
    description="AI-powered flashcard generation from images and text",
    version="1.0.0"
)

setup_exception_handlers(app)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://192.168.1.93:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
            suggestion="Tente novamente ou reformule o conteúdo"
        )


async def call_llm_with_retry(llm, prompt: str, max_retries: int = 3) -> str:
    """Call the LangChain LLM with retry logic for rate limits."""

    prompt_chars = len(prompt)
    estimated_tokens = prompt_chars // 4
    logger.info(f"📊 Prompt stats: {prompt_chars} chars, ~{estimated_tokens} estimated tokens")

    for attempt in range(max_retries):
        try:
            message = HumanMessage(content=prompt)
            response = await llm.ainvoke([message])

            response_text = response.content if hasattr(response, "content") else str(response)
            response_chars = len(response_text) if response_text else 0
            logger.info(f"✅ Response received: {response_chars} chars")

            return response_text

        except (RateLimitException, ExtractionFailedException,
                NoContentException, AIParseException,
                GenerationFailedException, MissingConfigException):
            # Let domain exceptions propagate immediately — no retry
            raise

        except Exception as e:
            error_str = str(e)

            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait_time = (attempt + 1) * 5
                logger.warning(f"⚠️ Rate limit hit (attempt {attempt + 1}/{max_retries}). Waiting {wait_time}s...")

                if attempt < max_retries - 1:
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise RateLimitException(
                        "API com muitas requisições. Aguarde alguns segundos e tente novamente.",
                        suggestion="Espere 30 segundos antes de tentar novamente"
                    )
            else:
                raise GenerationFailedException(
                    f"Erro na geração: {e}",
                    suggestion="Tente novamente em alguns instantes"
                )

    raise GenerationFailedException(
        "Falha após múltiplas tentativas",
        suggestion="Tente novamente em alguns instantes"
    )


@app.post("/api/generate", response_model=GenerationResponse)
async def generate_flashcards(
    image: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    context: str | None = Form(default=None),
    num_cards: int | None = Form(default=None)
):
    """
    Generate flashcards from image (OCR), text, or description.
    """
    source_text = ""
    
    logger.info(f"🚀 New generation request - mode: {'image' if image else 'text'}, num_cards: {num_cards}")

    # Step 1: Get source text
    if image:
        image_bytes = await image.read()

        try:
            source_text = extract_text(image_bytes)
        except ValueError as e:
            raise ExtractionFailedException(
                str(e),
                suggestion="Verifique se o arquivo é uma imagem válida"
            )

        logger.info(f"🖼️ OCR extracted {len(source_text)} chars")

        if not source_text or len(source_text.strip()) < 10:
            raise ExtractionFailedException(
                "Não foi possível extrair texto da imagem",
                suggestion="Tente enviar uma imagem mais nítida ou com texto mais legível"
            )

        prompt = format_generation_prompt(source_text, context, num_cards)

    elif text:
        source_text = text
        prompt = format_generation_prompt(source_text, context, num_cards)
        logger.info(f"📄 Text mode: {len(source_text)} chars")
    else:
        raise NoContentException(
            "Nenhum conteúdo fornecido",
            suggestion="Envie uma imagem ou texto"
        )

    logger.info("⏭️ Skipping guardian validation to save tokens")

    # Step 2: Generate flashcards via LangChain abstraction
    llm = get_llm()
    response_text = await call_llm_with_retry(llm, prompt)

    result = parse_ai_response(response_text)
    result.source_text_length = len(source_text)

    # Enforce card limit (in case AI ignores the prompt) - default to 5
    max_cards = num_cards if num_cards and num_cards > 0 else 5
    if len(result.cards) > max_cards:
        logger.info(f"⚠️ Slicing cards from {len(result.cards)} to {max_cards}")
        result.cards = result.cards[:max_cards]

    logger.info(f"🎉 Generated {len(result.cards)} cards successfully")

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=3000)