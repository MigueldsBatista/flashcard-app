"""Simple in-memory IP rate limiting middleware."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable, Iterable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class IPRateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limits requests per client IP on configured paths."""

    def __init__(
        self,
        app,
        max_requests: int = 60,
        window_seconds: int = 60,
        protected_paths: Iterable[str] = ("/api/generate",),
    ) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.protected_paths = tuple(protected_paths)
        self._lock = threading.Lock()
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _is_protected(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.protected_paths)

    @staticmethod
    def _extract_client_ip(request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        if request.client and request.client.host:
            return request.client.host

        return "unknown"

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Response],
    ) -> Response:
        if not self._is_protected(request.url.path):
            return await call_next(request)

        now = time.monotonic()
        cutoff = now - self.window_seconds
        client_ip = self._extract_client_ip(request)

        with self._lock:
            hits = self._hits[client_ip]
            while hits and hits[0] < cutoff:
                hits.popleft()

            if len(hits) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": {
                            "error": "Muitas requisições deste IP. Tente novamente em instantes.",
                            "error_code": "RATE_LIMITED",
                            "suggestion": "Reduza a frequência de chamadas e tente novamente",
                        }
                    },
                )

            hits.append(now)

        return await call_next(request)
