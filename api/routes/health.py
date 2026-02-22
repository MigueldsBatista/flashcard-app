"""Health-check endpoint."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": "flashcard-ai-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
