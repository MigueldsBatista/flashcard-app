from __future__ import annotations

import os

from api.modules.exceptions import MissingConfigException

from langchain_core.language_models import BaseChatModel


def get_llm(require_vision: bool = False, override_provider: str | None = None) -> BaseChatModel:
    """Return a LangChain BaseChatModel selected by the LLM_PROVIDER env var or override."""
    provider = override_provider.lower() if override_provider else os.environ.get("LLM_PROVIDER", "groq").lower()

    if provider == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise MissingConfigException(
                "GEMINI_API_KEY não configurada",
                suggestion="Defina a variável de ambiente GEMINI_API_KEY",
            )
        from langchain_google_genai import ChatGoogleGenerativeAI

        default_model = "gemini-2.0-flash"
        model_name = os.environ.get("LLM_VISION_MODEL" if require_vision else "LLM_MODEL", default_model)

        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.4,
            max_output_tokens=2048,
            max_retries=0,
        )

    if provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise MissingConfigException(
                "OPENAI_API_KEY não configurada",
                suggestion="Defina a variável de ambiente OPENAI_API_KEY",
            )
        from langchain_openai import ChatOpenAI

        default_model = "gpt-4o-mini"
        model_name = os.environ.get("LLM_VISION_MODEL" if require_vision else "LLM_MODEL", default_model)

        return ChatOpenAI(
            model=model_name,
            openai_api_key=api_key,
            temperature=0.4,
            max_tokens=2048,
            max_retries=0,
        )
        
    if provider == "groq":
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise MissingConfigException(
                "GROQ_API_KEY não configurada",
                suggestion="Defina a variável de ambiente GROQ_API_KEY",
            )
        from langchain_groq import ChatGroq

        default_model = "meta-llama/llama-4-scout-17b-16e-instruct" if require_vision else "llama-3.1-8b-instant"
        model_name = os.environ.get("LLM_VISION_MODEL" if require_vision else "LLM_MODEL", default_model)

        return ChatGroq(
            model=model_name,
            groq_api_key=api_key,
            temperature=0.4,
            max_tokens=2048,
            max_retries=0,
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