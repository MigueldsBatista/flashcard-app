"""
Schema Parser Module
Pydantic models matching frontend flashcard.ts types for AI generation.
"""

from typing import Literal

from pydantic import BaseModel, Field


class CardContent(BaseModel):
    """Content structure for a flashcard, matching frontend CardContent type."""
    front: str = Field(..., description="Front side of the card (question)")
    back: str = Field(..., description="Back side of the card (answer)")
    type: Literal['text', 'code'] = Field(
        default='text',
        description="Type of card content"
    )
    language: str | None = Field(
        default=None,
        description="Programming language for code cards"
    )


class GeneratedCard(BaseModel):
    """A single generated flashcard."""
    content: CardContent


class GenerationResponse(BaseModel):
    """Response from the AI generation endpoint."""
    cards: list[GeneratedCard] = Field(
        ...,
        description="List of generated flashcards"
    )
    detected_language: str = Field(
        default="pt",
        description="Detected language of the source content"
    )
    source_text_length: int = Field(
        default=0,
        description="Length of the processed source text"
    )


class GenerationError(BaseModel):
    """Error response for generation failures."""
    error: str
    error_code: Literal[
        'NO_CONTENT',
        'NOT_EDUCATIONAL',
        'EXTRACTION_FAILED',
        'GENERATION_FAILED',
        'VALIDATION_FAILED'
    ]
    suggestion: str | None = None


# JSON Schema for prompting Gemini
FLASHCARD_JSON_SCHEMA = """
{
  "cards": [
    {
      "content": {
        "front": "Pergunta ou conceito",
        "back": "Resposta ou explicação",
        "type": "text"
      }
    }
  ],
  "detected_language": "pt"
}
"""
