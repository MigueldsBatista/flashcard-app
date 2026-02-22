"""
Tests for US-006: LangChain LLM Abstraction.

Verifies that:
  - get_llm() returns the correct BaseChatModel for each LLM_PROVIDER value
  - LLM_PROVIDER=fake delivers a valid /api/generate response without network calls
  - Missing API keys and unknown providers raise MissingConfigException (500 MISSING_CONFIG)
"""

import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

try:
    from api.index import app
    from api.modules.ai import get_llm
    from api.modules.exceptions import MissingConfigException
except ImportError:
    from index import app
    from modules.ai import get_llm
    from modules.exceptions import MissingConfigException


# ---
# Base test class (same pattern as test_exceptions.py)
# ---------------------------------------------------------------------------

class BaseAPITest(unittest.TestCase):
    """Shared client and assertion helpers."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app, raise_server_exceptions=False)

    def get_detail(self, response) -> dict:
        return response.json()["detail"]

    def assertErrorCode(self, response, expected_status: int, expected_code: str) -> dict:
        self.assertEqual(response.status_code, expected_status)
        detail = self.get_detail(response)
        self.assertEqual(detail["error_code"], expected_code)
        return detail


# ---------------------------------------------------------------------------
# 1. get_llm() factory — unit tests
# ---------------------------------------------------------------------------

class TestGetLlm(BaseAPITest):
    """Tests for the get_llm() factory function."""

    def test_gemini_returns_correct_type(self):
        """LLM_PROVIDER=gemini → get_llm() returns ChatGoogleGenerativeAI."""
        from langchain_google_genai import ChatGoogleGenerativeAI

        env = {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "fake-gemini-key"}
        with patch.dict(os.environ, env, clear=False):
            llm = get_llm()

        self.assertIsInstance(llm, ChatGoogleGenerativeAI)

    def test_openai_returns_correct_type(self):
        """LLM_PROVIDER=openai → get_llm() returns ChatOpenAI."""
        from langchain_openai import ChatOpenAI

        env = {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "fake-openai-key"}
        with patch.dict(os.environ, env, clear=False):
            llm = get_llm()

        self.assertIsInstance(llm, ChatOpenAI)

    def test_fake_returns_fake_model(self):
        """LLM_PROVIDER=fake → get_llm() returns FakeListChatModel."""
        from langchain_core.language_models.fake_chat_models import FakeListChatModel

        with patch.dict(os.environ, {"LLM_PROVIDER": "fake"}, clear=False):
            llm = get_llm()

        self.assertIsInstance(llm, FakeListChatModel)

    def test_unknown_provider_raises_missing_config(self):
        """Unknown LLM_PROVIDER → MissingConfigException."""
        with patch.dict(os.environ, {"LLM_PROVIDER": "unknown_provider"}, clear=False):
            with self.assertRaises(MissingConfigException):
                get_llm()

    def test_gemini_missing_key_raises_missing_config(self):
        """LLM_PROVIDER=gemini without GEMINI_API_KEY → MissingConfigException."""
        with patch.dict(os.environ, {"LLM_PROVIDER": "gemini"}, clear=False):
            os.environ.pop("GEMINI_API_KEY", None)
            with self.assertRaises(MissingConfigException):
                get_llm()


# ---------------------------------------------------------------------------
# 2. Full integration with fake provider — no network calls
# ---------------------------------------------------------------------------

class TestFakeProvider(BaseAPITest):
    """End-to-end /api/generate tests using LLM_PROVIDER=fake."""

    def test_generate_returns_valid_cards(self):
        """LLM_PROVIDER=fake → POST /api/generate returns 200 with ≥1 card."""
        with patch.dict(os.environ, {"LLM_PROVIDER": "fake"}, clear=False):
            response = self.client.post(
                "/api/generate",
                data={"text": "Photossíntese é o processo pelo qual plantas produzem alimento."},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("cards", body)
        self.assertGreaterEqual(len(body["cards"]), 1)

    def test_generate_card_has_front_and_back(self):
        """Each card returned by fake provider has front and back fields."""
        with patch.dict(os.environ, {"LLM_PROVIDER": "fake"}, clear=False):
            response = self.client.post(
                "/api/generate",
                data={"text": "Fotossíntese converte luz solar em energia química."},
            )

        self.assertEqual(response.status_code, 200)
        card = response.json()["cards"][0]["content"]
        self.assertIn("front", card)
        self.assertIn("back", card)

    def test_contract_unchanged_across_providers(self):
        """Response schema must be identical regardless of provider (fake vs mocked real)."""
        from unittest.mock import AsyncMock, MagicMock

        real_response_json = (
            '{"cards": [{"content": {"front": "Q", "back": "A", "type": "text"}}], "detected_language": "pt"}'
        )
        mock_llm = MagicMock()
        mock_message = MagicMock()
        mock_message.content = real_response_json
        mock_llm.ainvoke = AsyncMock(return_value=mock_message)

        # fake provider
        with patch.dict(os.environ, {"LLM_PROVIDER": "fake"}, clear=False):
            fake_resp = self.client.post("/api/generate", data={"text": "word " * 20})

        # mocked real provider
        with patch("routes.generate.get_llm", return_value=mock_llm):
            real_resp = self.client.post("/api/generate", data={"text": "word " * 20})

        self.assertEqual(fake_resp.status_code, real_resp.status_code)
        self.assertEqual(set(fake_resp.json().keys()), set(real_resp.json().keys()))


if __name__ == "__main__":
    unittest.main()
