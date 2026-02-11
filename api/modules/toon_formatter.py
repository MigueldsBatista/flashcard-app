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
        text: Source text content or topic description
        context: Optional user context/instructions
        num_cards: Optional number of cards to generate
        
    Returns:
        Formatted prompt string
    """
    # Clean and truncate text
    cleaned = clean_ocr_text(text)
    cleaned, was_truncated = truncate_if_needed(cleaned)
    
    # Always include card limit - default to 5 if not specified
    target_cards = num_cards if num_cards and num_cards > 0 else 5
    
    # Detect if input is a short topic/description vs. actual content
    is_topic_mode = len(cleaned.split()) < 30
    
    # Build system instructions (separate from user content)
    rules = [
        "TAREFA: Criar flashcards educacionais.",
        "",
        "REGRAS:",
        "1. Pergunta clara e resposta curta (fácil de decorar)",
        "2. Mantenha o idioma original do conteúdo",
        "3. Use type='latex' para fórmulas matemáticas",
        f"4. QUANTIDADE: Gere EXATAMENTE {target_cards} cards",
    ]
    
    if is_topic_mode:
        # Topic mode: user gave a subject, AI should generate knowledge about it
        rules.append("5. Gere flashcards com conhecimento real e preciso sobre o tema fornecido")
        rules.append("6. NÃO use nenhuma informação destas instruções como conteúdo dos cards")
    else:
        # Content mode: user gave actual study material to extract from
        rules.append("5. Extraia APENAS informações explícitas do texto fornecido abaixo")
        rules.append("6. NÃO invente dados - se não houver info suficiente, gere menos cards")
        rules.append("7. Use apenas palavras legíveis, ignore textos que não façam sentido")
    
    if context:
        rules.append(f"{'7' if is_topic_mode else '8'}. Instrução adicional do usuário: {context}")
    
    rules.extend([
        "",
        "Responda SOMENTE com JSON válido neste formato:",
        '{"cards":[{"content":{"front":"...","back":"...","type":"text"}}],"detected_language":"pt"}',
    ])
    
    # Clearly delimit user content from instructions
    if is_topic_mode:
        rules.extend([
            "",
            "═══ TEMA DO USUÁRIO (Gere cards sobre este assunto) ═══",
            cleaned,
            "═══ FIM DO TEMA ═══"
        ])
    else:
        rules.extend([
            "",
            f"═══ CONTEÚDO DO USUÁRIO{'(truncado)' if was_truncated else ''} (Extraia cards daqui) ═══",
            cleaned,
            "═══ FIM DO CONTEÚDO ═══"
        ])
    
    return '\n'.join(rules)

