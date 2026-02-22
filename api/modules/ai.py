from __future__ import annotations

import os

try:
    from api.modules.exceptions import MissingConfigException
except ImportError:
    from modules.exceptions import MissingConfigException

from langchain_core.language_models import BaseChatModel


def get_llm() -> BaseChatModel:
    """Return a LangChain BaseChatModel selected by the LLM_PROVIDER env var."""
    provider = os.environ.get("LLM_PROVIDER", "groq").lower()

    if provider == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise MissingConfigException(
                "GEMINI_API_KEY não configurada",
                suggestion="Defina a variável de ambiente GEMINI_API_KEY",
            )
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=os.environ.get("LLM_MODEL", "gemini-2.0-flash"),
            google_api_key=api_key,
            temperature=0.4,
            max_output_tokens=2048,
        )

    if provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise MissingConfigException(
                "OPENAI_API_KEY não configurada",
                suggestion="Defina a variável de ambiente OPENAI_API_KEY",
            )
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=os.environ.get("LLM_MODEL", "gpt-4o-mini"),
            openai_api_key=api_key,
            temperature=0.4,
            max_tokens=2048,
        )
        
    if provider == "groq":
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise MissingConfigException(
                "GROQ_API_KEY não configurada",
                suggestion="Defina a variável de ambiente GROQ_API_KEY",
            )
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=os.environ.get("LLM_MODEL", "llama-3.1-8b-instant"),
            groq_api_key=api_key,
            temperature=0.4,
            max_tokens=2048,
        )

    if provider == "fake":
        from langchain_core.language_models.fake_chat_models import FakeListChatModel

        _FAKE_RESPONSE = (
            '{"cards": ['
            '{"content": {"front": "Fake Question", "back": "Fake Answer", "type": "text"}}'
            '], "detected_language": "pt"}'
        )
        return FakeListChatModel(responses=[_FAKE_RESPONSE])

    raise MissingConfigException(
        f"LLM_PROVIDER '{provider}' não é suportado",
        suggestion="Use: gemini, openai ou fake",
    )