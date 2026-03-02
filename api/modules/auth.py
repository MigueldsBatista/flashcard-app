"""Authentication helpers for API routes."""

from __future__ import annotations

import json
import logging
import os
import time
from urllib.request import urlopen

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.algorithms import ECAlgorithm
from jwt.exceptions import InvalidTokenError

logger = logging.getLogger(__name__)

from api.modules.exceptions import MissingConfigException, UnauthorizedException

security = HTTPBearer(auto_error=False)

# ── JWKS cache (in-memory, refreshed every 10 min) ──────────

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
_JWKS_TTL_SECONDS = 600  # 10 minutes


def _get_jwks_url() -> str:
    """Build the JWKS endpoint from the Supabase URL or issuer."""
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
    if supabase_url:
        return f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    raise MissingConfigException(
        "SUPABASE_URL não configurado",
        suggestion="Defina SUPABASE_URL no ambiente para validação JWKS",
    )


def _fetch_jwks() -> dict:
    """Fetch and cache the Supabase JWKS key set."""
    global _jwks_cache, _jwks_cache_time

    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_TTL_SECONDS:
        return _jwks_cache

    url = _get_jwks_url()
    logger.info("Fetching JWKS from %s", url)
    with urlopen(url, timeout=5) as resp:
        data = json.loads(resp.read())

    _jwks_cache = data
    _jwks_cache_time = now
    return data


def _get_es256_public_key(token: str):
    """Extract the matching ES256 public key from JWKS for the given token."""
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    jwks = _fetch_jwks()

    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid and key_data.get("kty") == "EC":
            return ECAlgorithm(ECAlgorithm.SHA256).from_jwk(key_data)

    # Fallback: use first EC key if no kid match
    for key_data in jwks.get("keys", []):
        if key_data.get("kty") == "EC":
            logger.warning("No kid match; using first EC key from JWKS")
            return ECAlgorithm(ECAlgorithm.SHA256).from_jwk(key_data)

    raise InvalidTokenError("No matching EC key found in Supabase JWKS")


def _get_supabase_jwt_secret() -> str:
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise MissingConfigException(
            "SUPABASE_JWT_SECRET não configurado",
            suggestion="Defina SUPABASE_JWT_SECRET no ambiente de execução",
        )
    return secret


def _decode_supabase_token(token: str) -> dict:
    """Decode a Supabase JWT, supporting both HS256 and ES256."""
    audience = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
    options = {"verify_aud": bool(audience)}

    # Detect algorithm from token header
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg == "ES256":
        key = _get_es256_public_key(token)
        return jwt.decode(
            token,
            key,
            algorithms=["ES256"],
            audience=audience if audience else None,
            options=options,
        )

    # Fallback to HS256 (legacy Supabase projects)
    secret = _get_supabase_jwt_secret()
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience=audience if audience else None,
        options=options,
    )


async def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Validate bearer token and return JWT claims."""

    if not credentials or credentials.scheme.lower() != "bearer":
        raise UnauthorizedException(
            "Token de autenticação ausente",
            suggestion="Envie Authorization: Bearer <jwt>",
        )

    try:
        claims = _decode_supabase_token(credentials.credentials)
    except MissingConfigException:
        raise
    except InvalidTokenError as e:
        logger.error(
            "JWT validation failed: %s (%s). Token prefix: %s...",
            e,
            type(e).__name__,
            credentials.credentials[:20] if credentials.credentials else "empty",
        )
        # Decode without verification to inspect claims for debugging
        try:
            unverified = jwt.decode(
                credentials.credentials,
                options={"verify_signature": False, "verify_aud": False, "verify_exp": False},
                algorithms=["HS256"],
            )
            logger.error(
                "Unverified token claims: iss=%s, aud=%s, sub=%s, exp=%s",
                unverified.get("iss"),
                unverified.get("aud"),
                unverified.get("sub"),
                unverified.get("exp"),
            )
        except Exception:
            logger.error("Could not decode token even without verification")
        raise UnauthorizedException(
            "Token inválido ou expirado",
            suggestion="Refaça login e tente novamente",
        )

    if not claims.get("sub"):
        raise UnauthorizedException(
            "Token sem identificador de usuário",
            suggestion="Refaça login para obter um token válido",
        )

    return claims
