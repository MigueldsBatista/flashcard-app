"""Critical security and ops tests: auth, rate limit, and health-check."""

import os
import unittest
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient

from api.app import create_app


class TestSecurityAndHealth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("SUPABASE_JWT_SECRET", "test-supabase-jwt-secret")

    def make_token(self) -> str:
        return jwt.encode(
            {"sub": "test-user", "aud": "authenticated"},
            os.environ["SUPABASE_JWT_SECRET"],
            algorithm="HS256",
        )

    def test_health_check_returns_200(self):
        app = create_app()
        client = TestClient(app, raise_server_exceptions=False)

        response = client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertIn("timestamp", body)

    def test_generate_requires_auth(self):
        app = create_app()
        client = TestClient(app, raise_server_exceptions=False)

        response = client.post("/api/generate", data={"text": "word " * 20})

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"]["error_code"], "AUTH_REQUIRED")

    def test_generate_rate_limited_by_ip(self):
        env = {
            "RATE_LIMIT_MAX_REQUESTS": "1",
            "RATE_LIMIT_WINDOW_SECONDS": "60",
            "LLM_PROVIDER": "fake",
        }
        with patch.dict(os.environ, env, clear=False):
            app = create_app()
            client = TestClient(app, raise_server_exceptions=False)

            token = self.make_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "x-forwarded-for": "10.20.30.40",
            }

            first = client.post(
                "/api/generate",
                data={"text": "word " * 20},
                headers=headers,
            )
            second = client.post(
                "/api/generate",
                data={"text": "word " * 20},
                headers=headers,
            )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)
        self.assertEqual(second.json()["detail"]["error_code"], "RATE_LIMITED")


if __name__ == "__main__":
    unittest.main()
