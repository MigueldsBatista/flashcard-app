"""Authentication helpers for API routes."""

from __future__ import annotations

import os

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError

try:
    from api.modules.exceptions import MissingConfigException, UnauthorizedException
except ImportError:
    from modules.exceptions import MissingConfigException, UnauthorizedException

security = HTTPBearer(auto_error=False)


def _get_supabase_jwt_secret() -> str:
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise MissingConfigException(
            "SUPABASE_JWT_SECRET não configurado",
            suggestion="Defina SUPABASE_JWT_SECRET no ambiente de execução",
        )
    return secret


def _decode_supabase_token(token: str) -> dict:
    secret = _get_supabase_jwt_secret()
    audience = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

    options = {"verify_aud": bool(audience)}

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
    except InvalidTokenError:
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
