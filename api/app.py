"""
Application factory for the Flashcard AI API.

Creates and configures the FastAPI application instance,
including CORS middleware and exception handlers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from api.modules.exceptions import setup_exception_handlers
except ImportError:
    from modules.exceptions import setup_exception_handlers


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
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://192.168.1.93:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register route modules
    try:
        from api.routes.generate import router
    except ImportError:
        from routes.generate import router

    application.include_router(router)

    return application
