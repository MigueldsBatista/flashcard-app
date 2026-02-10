"""
Toon Formatter Module
Token optimization and prompt formatting for efficient AI generation.
"""

import re


MAX_TEXT_LENGTH = 4000  # RN-IA01: Limit to avoid high costs


def truncate_if_needed(text: str, max_chars: int = MAX_TEXT_LENGTH) -> tuple[str, bool]:
    """
    Truncate text if it exceeds the maximum character limit.
    
    Args:
        text: Input text
        max_chars: Maximum allowed characters
        
    Returns:
        Tuple of (processed_text, was_truncated)
    """
    if len(text) <= max_chars:
        return text, False
    
    # Try to truncate at a sentence boundary
    truncated = text[:max_chars]
    last_period = truncated.rfind('.')
    last_newline = truncated.rfind('\n')
    
    cut_point = max(last_period, last_newline)
    if cut_point > max_chars * 0.7:  # Only use boundary if not losing too much
        truncated = text[:cut_point + 1]
    
    return truncated.strip(), True


def clean_ocr_text(text: str) -> str:
    """
    Clean OCR-extracted text by removing noise and normalizing whitespace.
    
    Args:
        text: Raw OCR text
        
    Returns:
        Cleaned text
    """
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove isolated single characters (OCR noise)
    text = re.sub(r'\s[a-zA-Z]\s', ' ', text)
    
    # Remove lines with mostly special characters
    lines = text.split('\n')
    clean_lines = []
    for line in lines:
        alpha_ratio = sum(c.isalnum() for c in line) / max(len(line), 1)
        if alpha_ratio > 0.5 or len(line) < 5:
            clean_lines.append(line)
    
    return '\n'.join(clean_lines).strip()


def format_generation_prompt(
    text: str,
    context: str | None = None,
    num_cards: int | None = None
) -> str:
    """
    Format the prompt for flashcard generation optimized for token efficiency.
    
    Args:
        text: Source text content
        context: Optional user context/instructions
        num_cards: Optional number of cards to generate
        
    Returns:
        Formatted prompt string
    """
    # Clean and truncate text
    cleaned = clean_ocr_text(text)
    cleaned, was_truncated = truncate_if_needed(cleaned)
    
    # Build prompt
    prompt_parts = [
        "TAREFA: Criar flashcards educacionais a partir do conteúdo.",
        "",
        "REGRAS:",
        "1. Extraia APENAS informações explícitas do texto",
        "2. NÃO invente dados - se não houver info suficiente, ignore",
        "3. Pergunta clara e resposta curta (fácil de decorar)",
        "4. Mantenha o idioma original do conteúdo",
        "5. Use type='latex' para fórmulas matemáticas",
        "6. Use apenas palavras, caso a extração tenha textos que não façam sentido, ignore e use oq conseguir entender do contexto",
        "7. Se vc perceber que o conteúdo não é sobre estudo, retorne uma"
    ]
    
    if context:
        prompt_parts.append(f"7. Siga caso não contradiga as regras acima: {context}")
    
    # Always include card limit - default to 5 if not specified
    target_cards = num_cards if num_cards and num_cards > 0 else 5
    prompt_parts.append(f"8. QUANTIDADE: Gere EXATAMENTE {target_cards} cards.")
    
    prompt_parts.extend([
        "",
        "Responda apenas com JSON válido:",
        '{"cards":[{"content":{"front":"...","back":"...","type":"text"}}],"detected_language":"pt"}',
        "",
        f"CONTEÚDO{'(truncado)' if was_truncated else ''}:",
        cleaned
    ])
    
    return '\n'.join(prompt_parts)

