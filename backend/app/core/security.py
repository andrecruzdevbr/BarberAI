"""Utilitários de segurança — hash de senha e JWT."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.models.enums import UserRole
from app.models.user import User

_password_hasher = PasswordHash.recommended()

INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos."


def normalize_email(email: str) -> str:
    """Normaliza e-mail para persistência e busca."""
    return email.strip().lower()


def hash_password(password: str) -> str:
    """Gera hash Argon2 da senha."""
    return _password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica senha contra hash armazenado."""
    return _password_hasher.verify(plain_password, hashed_password)


def create_access_token(user: User) -> str:
    """Gera JWT de acesso com claims mínimos exigidos."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "barbershop_id": str(user.barbershop_id),
        "role": user.role.value if isinstance(user.role, UserRole) else user.role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decodifica e valida JWT de acesso."""
    settings = get_settings()
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )


def parse_token_subject(payload: dict) -> UUID:
    """Extrai UUID do usuário do claim sub."""
    return UUID(payload["sub"])
