"""Shared test utilities for the Flashcard AI API test suite."""

import unittest
from fastapi.testclient import TestClient

try:
    from api.index import app
except ImportError:
    from index import app


class BaseAPITest(unittest.TestCase):
    """Base class with shared client and assertion helpers."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app, raise_server_exceptions=False)

    def get_detail(self, response) -> dict:
        return response.json()["detail"]

    def assertErrorShape(self, detail: dict) -> None:
        self.assertIn("error", detail)
        self.assertIn("error_code", detail)

    def assertErrorCode(self, response, expected_status: int, expected_code: str) -> dict:
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