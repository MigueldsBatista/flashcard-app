"""
Flashcard generation route.

Handles the POST /api/generate endpoint — orchestrates OCR extraction,
prompt formatting, LLM invocation, and response validation.
"""

import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile

from api.modules.ai import get_llm
from api.modules.auth import require_authenticated_user
from api.modules.exceptions import (
    ExtractionFailedException,
    NoContentException,
)
from api.modules.schema_parser import GenerationResponse
from api.modules.toon_formatter import format_generation_prompt
from api.modules.vision_engine import extract_text
from api.services.generation import call_llm_with_retry, parse_ai_response

logger = logging.getLogger(__name__)

    
router = APIRouter(dependencies=[Depends(require_authenticated_user)])


@router.post(
    "/api/generate",
    response_model=GenerationResponse,
)
async def generate_flashcards(
    image: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    context: str | None = Form(default=None),
    num_cards: int | None = Form(default=None),
):
    """
    Generate flashcards from image (OCR), text, or description.
    """
    source_text = ""

    logger.info(
        f"🚀 New generation request - mode: {'image' if image else 'text'}, "
        f"num_cards: {num_cards}"
    )

    # Step 1: Get source text
    if image:
        image_bytes = await image.read()

        source_text = extract_text(image_bytes)

        logger.info(f"🖼️ OCR extracted {len(source_text)} chars")

        if not source_text or len(source_text.strip()) < 10:
            raise ExtractionFailedException(
                "Não foi possível extrair texto da imagem",
                suggestion="Tente enviar uma imagem mais nítida ou com texto mais legível",
            )

        prompt = format_generation_prompt(source_text, context, num_cards)

    elif text:
        source_text = text
        prompt = format_generation_prompt(source_text, context, num_cards)
        logger.info(f"📄 Text mode: {len(source_text)} chars")
    else:
        raise NoContentException(
            "Nenhum conteúdo fornecido",
            suggestion="Envie uma imagem ou texto",
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
