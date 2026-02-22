"""
Tests for US-007: Structured Error Handling via Custom Exceptions.

Covers every domain exception and verifies:
  - Correct HTTP status code
  - Correct error_code in the response body
  - Response body shape: {"detail": {"error": ..., "error_code": ..., "suggestion": ...}}
"""

import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
from fastapi.testclient import TestClient

try:
    from api.index import app
except ImportError:
    from index import app


# ---------------------------------------------------------------------------
# Base test class
# ---------------------------------------------------------------------------

class BaseAPITest(unittest.TestCase):
    """Shared client and assertion helpers for all endpoint tests."""

    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("SUPABASE_JWT_SECRET", "test-supabase-jwt-secret")
        cls.client = TestClient(app, raise_server_exceptions=False)

    def auth_headers(self, ip: str = "127.0.0.1") -> dict:
        token = jwt.encode(
            {"sub": "test-user", "aud": "authenticated"},
            os.environ["SUPABASE_JWT_SECRET"],
            algorithm="HS256",
        )
        return {
            "Authorization": f"Bearer {token}",
            "x-forwarded-for": ip,
        }

    def get_detail(self, response) -> dict:
        """Return the 'detail' dict from a JSON error response."""
        return response.json()["detail"]

    def assertErrorShape(self, detail: dict) -> None:
        """Every domain error body must have at least error + error_code."""
        self.assertIn("error", detail)
        self.assertIn("error_code", detail)

    def assertErrorCode(self, response, expected_status: int, expected_code: str) -> dict:
        """Assert status + error_code and return the detail dict."""
        self.assertEqual(response.status_code, expected_status)
        detail = self.get_detail(response)
        self.assertEqual(detail["error_code"], expected_code)
        self.assertErrorShape(detail)
        return detail

    def _make_llm_mock(self, response_text: str | None = None, side_effect=None):
        """Build a fake BaseChatModel whose ainvoke returns an AIMessage-like object."""
        mock_llm = MagicMock()
        if side_effect is not None:
            mock_llm.ainvoke = AsyncMock(side_effect=side_effect)
        else:
            ai_message = MagicMock()
            ai_message.content = response_text
            mock_llm.ainvoke = AsyncMock(return_value=ai_message)
        return mock_llm


# ---------------------------------------------------------------------------
# 1. No content → 400 NO_CONTENT
# ---------------------------------------------------------------------------

class TestNoContent(BaseAPITest):
    def test_returns_400(self):
        """POST without image or text must return 400 NO_CONTENT."""
        response = self.client.post("/api/generate", headers=self.auth_headers())
        self.assertErrorCode(response, 400, "NO_CONTENT")

    def test_includes_suggestion(self):
        """NO_CONTENT response must include a suggestion."""
        response = self.client.post("/api/generate", headers=self.auth_headers())
        detail = self.get_detail(response)
        self.assertIn("suggestion", detail)


# ---------------------------------------------------------------------------
# 2. Extraction failure → 400 EXTRACTION_FAILED
# ---------------------------------------------------------------------------

class TestExtractionFailed(BaseAPITest):
    def test_extract_text_raises_value_error(self):
        """When extract_text raises ValueError, returns 400 EXTRACTION_FAILED."""
        with patch("routes.generate.extract_text", side_effect=ValueError("imagem inválida")):
            response = self.client.post(
                "/api/generate",
                files={"image": ("test.png", b"not-an-image", "image/png")},
                headers=self.auth_headers(),
            )
        self.assertErrorCode(response, 400, "EXTRACTION_FAILED")

    def test_ocr_text_too_short(self):
        """When OCR returns < 10 chars, returns 400 EXTRACTION_FAILED."""
        with patch("routes.generate.extract_text", return_value="ab"):
            response = self.client.post(
                "/api/generate",
                files={"image": ("test.png", b"\x89PNG\r\n\x1a\n", "image/png")},
                headers=self.auth_headers(),
            )
        self.assertErrorCode(response, 400, "EXTRACTION_FAILED")


# ---------------------------------------------------------------------------
# 3. Rate limit → 429 RATE_LIMITED
# ---------------------------------------------------------------------------

class TestRateLimit(BaseAPITest):
    def test_returns_429(self):
        """When the LLM keeps returning 429, route returns 429 RATE_LIMITED."""
        mock_llm = self._make_llm_mock(
            side_effect=Exception("429 RESOURCE_EXHAUSTED rate limit")
        )

        with (
            patch("routes.generate.get_llm", return_value=mock_llm),
            patch("services.generation.asyncio.sleep", new_callable=AsyncMock),
        ):
            response = self.client.post(
                "/api/generate",
                data={"text": "word " * 20},
                headers=self.auth_headers(),
            )

        self.assertErrorCode(response, 429, "RATE_LIMITED")


# ---------------------------------------------------------------------------
# 4. AI parse failure → 500 AI_PARSE_FAILED
# ---------------------------------------------------------------------------

class TestAIParseFailed(BaseAPITest):
    def test_malformed_json_returns_500(self):
        """When the LLM returns malformed JSON, route returns 500 AI_PARSE_FAILED."""
        mock_llm = self._make_llm_mock(response_text="this is not json at all {{{")

        with patch("routes.generate.get_llm", return_value=mock_llm):
            response = self.client.post(
                "/api/generate",
                data={"text": "word " * 20},
                headers=self.auth_headers(),
            )

        self.assertErrorCode(response, 500, "AI_PARSE_FAILED")


# ---------------------------------------------------------------------------
# 5. Missing config → 500 MISSING_CONFIG
# ---------------------------------------------------------------------------

class TestMissingConfig(BaseAPITest):
    def test_missing_api_key_returns_500(self):
        """When GEMINI_API_KEY is absent, returns 500 MISSING_CONFIG."""
        env_override = {"LLM_PROVIDER": "gemini"}
        env_remove = {"GEMINI_API_KEY": ""}
        with patch.dict(os.environ, {**env_override}, clear=False):
            os.environ.pop("GEMINI_API_KEY", None)
            response = self.client.post(
                "/api/generate",
                data={"text": "word " * 20},
                headers=self.auth_headers(),
            )

        self.assertErrorCode(response, 500, "MISSING_CONFIG")


# ---------------------------------------------------------------------------
# 6. Response body shape for all domain errors
# ---------------------------------------------------------------------------

class TestErrorBodyShape(BaseAPITest):
    def test_no_content_has_required_fields(self):
        response = self.client.post("/api/generate", headers=self.auth_headers())
        self.assertErrorCode(response, 400, "NO_CONTENT")

    def test_missing_config_has_required_fields(self):
        with patch.dict(os.environ, {"LLM_PROVIDER": "gemini"}, clear=False):
            os.environ.pop("GEMINI_API_KEY", None)
            response = self.client.post(
                "/api/generate",
                data={"text": "word " * 20},
                headers=self.auth_headers(),
            )
        self.assertErrorCode(response, 500, "MISSING_CONFIG")


if __name__ == "__main__":
    unittest.main()
