"""
Guardian Module
Content validation to ensure educational relevance before AI generation.
"""

import os
from google import genai


# Initialize Gemini client
def get_client() -> genai.Client:
    """Get or create Gemini client."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return genai.Client(api_key=api_key)


VALIDATION_PROMPT = """Você é um classificador de conteúdo educacional. Sua tarefa é determinar se o texto fornecido tem valor para estudo e memorização via flashcards.

CLASSIFIQUE o conteúdo como:
- "ESTUDO" se contiver: conceitos acadêmicos, definições, fórmulas, vocabulário, informações técnicas, dados históricos, procedimentos, ou qualquer conhecimento que valha ser memorizado.
- "RUIDO" se for: conversa casual, mensagens pessoais, fotos de lazer, paisagens sem contexto técnico, propagandas, ou conteúdo sem valor educacional.

RESPONDA APENAS com uma palavra: ESTUDO ou RUIDO

Texto para classificar:
{text}"""


async def validate_educational_content(text: str) -> tuple[bool, str | None]:
    """
    Validate if content has educational value using a lightweight AI check.
    
    Args:
        text: Text content to validate
        
    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if content is educational
        - error_message: Suggestion message if not valid, None otherwise
    """
    if not text or len(text.strip()) < 10:
        return False, "Conteúdo muito curto. Envie uma imagem ou texto com mais informações."
    
    try:
        client = get_client()
        
        # Use a smaller sample for validation (first 500 chars) to save tokens
        sample_text = text[:500] if len(text) > 500 else text
        
        response = await client.aio.models.generate_content(
            model='gemini-2.0-flash',
            contents=VALIDATION_PROMPT.format(text=sample_text),
            config={
                'temperature': 0.1,
                'max_output_tokens': 10
            }
        )
        
        result = response.text.strip().upper()
        
        if "ESTUDO" in result:
            return True, None
        else:
            return False, "Este conteúdo não parece ter valor educacional. Tente enviar material de estudo como slides, livros, anotações ou textos técnicos."
            
    except Exception as e:
        # If validation fails, allow content through (fail open)
        print(f"Warning: Guardian validation failed: {e}")
        return True, None
