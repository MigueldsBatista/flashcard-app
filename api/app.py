"""
Application factory for the Flashcard AI API.

Creates and configures the FastAPI application instance,
including CORS middleware and exception handlers.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from api.modules.exceptions import setup_exception_handlers
    from api.modules.rate_limit import IPRateLimitMiddleware
except ImportError:
    from modules.exceptions import setup_exception_handlers
    from modules.rate_limit import IPRateLimitMiddleware


ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

def create_app() -> FastAPI:
    """Build and return a fully configured FastAPI application."""

    application = FastAPI(
        title="Flashcard AI API",
        description="AI-powered flashcard generation from images and text",
        version="1.0.0",
    )

    setup_exception_handlers(application)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    max_requests = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "60"))
    window_seconds = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

    application.add_middleware(
        IPRateLimitMiddleware,
        max_requests=max_requests,
        window_seconds=window_seconds,
        protected_paths=("/api/generate",),
    )

    # Register route modules
    try:
        from api.routes.generate import router
        from api.routes.health import router as health_router
    except ImportError:
        from routes.generate import router
        from routes.health import router as health_router

    application.include_router(router)
    application.include_router(health_router)

    return application
