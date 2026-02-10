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

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import ValidationError

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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Flashcard AI API",
    description="AI-powered flashcard generation from images and text",
    version="1.0.0"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://192.168.1.93:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_gemini_client() -> genai.Client:
    """Get Gemini client with API key from environment."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY not configured"
        )
    return genai.Client(api_key=api_key)


def parse_ai_response(response_text: str) -> GenerationResponse:
    """Parse and validate AI response JSON."""
    # Extract JSON from response (handle markdown code blocks)
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
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response: {e}")
    except ValidationError as e:
        raise ValueError(f"Response validation failed: {e}")


async def call_gemini_with_retry(client: genai.Client, prompt: str, max_retries: int = 3) -> str:
    """Call Gemini API with retry logic for rate limits."""
    
    # Log prompt stats
    prompt_chars = len(prompt)
    estimated_tokens = prompt_chars // 4  # Rough estimate: 4 chars per token
    logger.info(f"📊 Prompt stats: {prompt_chars} chars, ~{estimated_tokens} estimated tokens")
    
    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
                config={
                    'temperature': 0.4,
                    'max_output_tokens': 2048  # Reduced from 4096
                }
            )
            
            # Log response stats
            response_chars = len(response.text) if response.text else 0
            logger.info(f"✅ Response received: {response_chars} chars")
            
            return response.text
            
        except Exception as e:
            error_str = str(e)
            
            # Check for rate limit errors
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait_time = (attempt + 1) * 5  # 5s, 10s, 15s
                logger.warning(f"⚠️ Rate limit hit (attempt {attempt + 1}/{max_retries}). Waiting {wait_time}s...")
                
                if attempt < max_retries - 1:
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise HTTPException(
                        status_code=429,
                        detail={
                            "error": "API com muitas requisições. Aguarde alguns segundos e tente novamente.",
                            "error_code": "RATE_LIMITED",
                            "suggestion": "Espere 30 segundos antes de tentar novamente"
                        }
                    )
            else:
                raise e
    
    raise HTTPException(status_code=500, detail="Falha após múltiplas tentativas")


@app.post("/api/generate", response_model=GenerationResponse)
async def generate_flashcards(
    image: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    context: str | None = Form(default=None),
    num_cards: int | None = Form(default=None)
):
    """
    Generate flashcards from image (OCR), text, or description.
    
    - **image**: Upload an image for OCR text extraction
    - **text**: Direct text content to process
    - **context**: Optional context/instructions (e.g., "focar nos termos em latim")
    - **description**: Generate cards from description only (e.g., "10 cards sobre Ciclo de Krebs")
    - **num_cards**: Optional target number of cards
    """
    source_text = ""
    
    logger.info(f"🚀 New generation request - mode: {'image' if image else 'text'}, num_cards: {num_cards}")
    
    # Step 1: Get source text
    if image:
        # OCR mode
        try:
            image_bytes = await image.read()
            source_text = extract_text(image_bytes)
            logger.info(f"🖼️ OCR extracted {len(source_text)} chars")
            
            if not source_text or len(source_text.strip()) < 10:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "Não foi possível extrair texto da imagem",
                        "error_code": "EXTRACTION_FAILED",
                        "suggestion": "Tente enviar uma imagem mais nítida ou com texto mais legível"
                    }
                )
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": str(e),
                    "error_code": "EXTRACTION_FAILED",
                    "suggestion": "Verifique se o arquivo é uma imagem válida"
                }
            )
        
        prompt = format_generation_prompt(source_text, context, num_cards)
        
    elif text:
        # Direct text mode
        source_text = text
        prompt = format_generation_prompt(source_text, context, num_cards)
        logger.info(f"📄 Text mode: {len(source_text)} chars")
    else:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Nenhum conteúdo fornecido",
                "error_code": "NO_CONTENT",
                "suggestion": "Envie uma imagem, texto, ou descrição"
            }
        )
    
    # Step 2: Skip validation for description mode (saves tokens!)
    # For text/image, we also skip validation to reduce API calls
    logger.info("⏭️ Skipping guardian validation to save tokens")
    
    # Step 3: Generate flashcards with Gemini
    try:
        client = get_gemini_client()
        response_text = await call_gemini_with_retry(client, prompt)
        
        result = parse_ai_response(response_text)
        result.source_text_length = len(source_text)
        
        # Enforce card limit (in case AI ignores the prompt) - default to 5
        max_cards = num_cards if num_cards and num_cards > 0 else 5
        if len(result.cards) > max_cards:
            logger.info(f"⚠️ Slicing cards from {len(result.cards)} to {max_cards}")
            result.cards = result.cards[:max_cards]
        
        logger.info(f"🎉 Generated {len(result.cards)} cards successfully")
        
        return result
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"❌ Parse error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Falha ao processar resposta da IA: {str(e)}",
                "error_code": "VALIDATION_FAILED",
                "suggestion": "Tente novamente ou reformule o conteúdo"
            }
        )
    except Exception as e:
        logger.error(f"❌ Generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Erro na geração: {str(e)}",
                "error_code": "GENERATION_FAILED",
                "suggestion": "Tente novamente em alguns instantes"
            }
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)