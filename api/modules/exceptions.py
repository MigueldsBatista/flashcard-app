"""
Structured error handling for the Flashcard AI API.

Defines a domain exception hierarchy rooted at AppException(HTTPException).
Each subclass declares its own status_code and error_code so that routes
only need to `raise SomeException("human message")` — no try/except required.

Usage:
    from modules.exceptions import setup_exception_handlers, RateLimitException
    setup_exception_handlers(app)
    # then in a route:
    raise RateLimitException("Tente novamente em 60s")
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base exception
# ---------------------------------------------------------------------------

class AppException(StarletteHTTPException):
    """Base class for all domain exceptions.

    Subclasses must define:
        status_code: int
        error_code: str

    The caller supplies a human-readable *detail* message and an optional
    *suggestion* string.
    """

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, detail: str, suggestion: str | None = None) -> None:
        super().__init__(status_code=self.status_code, detail=detail)
        self.message = detail
        self.suggestion = suggestion


# ---------------------------------------------------------------------------
# 4xx — client errors
# ---------------------------------------------------------------------------

class RateLimitException(AppException):
    """429 — upstream API rate limit exhausted."""
    status_code = 429
    error_code = "RATE_LIMITED"


class ExtractionFailedException(AppException):
    """400 — text could not be extracted from the supplied image."""
    status_code = 400
    error_code = "EXTRACTION_FAILED"


class NoContentException(AppException):
    """400 — request carries neither image nor text."""
    status_code = 400
    error_code = "NO_CONTENT"


# ---------------------------------------------------------------------------
# 5xx — server / integration errors
# ---------------------------------------------------------------------------

class AIParseException(AppException):
    """500 — AI returned a response that could not be parsed."""
    status_code = 500
    error_code = "AI_PARSE_FAILED"


class GenerationFailedException(AppException):
    """500 — generic failure during the generation pipeline."""
    status_code = 500
    error_code = "GENERATION_FAILED"


class MissingConfigException(AppException):
    """500 — required environment variable / configuration is absent."""
    status_code = 500
    error_code = "MISSING_CONFIG"


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------

def _error_body(exc: AppException) -> dict:
    body: dict = {"error": exc.message, "error_code": exc.error_code}
    if exc.suggestion:
        body["suggestion"] = exc.suggestion
    return body


async def _app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    if exc.status_code >= 500:
        logger.error("5xx %s [%s]: %s", exc.status_code, exc.error_code, exc.message)
    else:
        logger.warning("4xx %s [%s]: %s", exc.status_code, exc.error_code, exc.message)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": _error_body(exc)},
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """Register the global AppException handler on a FastAPI application."""
    app.add_exception_handler(AppException, _app_exception_handler)  # type: ignore[arg-type]
