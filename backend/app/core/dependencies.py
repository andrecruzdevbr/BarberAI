"""Dependencies FastAPI — autenticação e usuário atual."""

from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import decode_access_token, parse_token_subject
from app.models.enums import UserRole
from app.models.user import User

_bearer_scheme = HTTPBearer(auto_error=False)

UNAUTHORIZED_HEADERS = {"WWW-Authenticate": "Bearer"}


def _unauthorized(detail: str = "Token inválido ou expirado.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers=UNAUTHORIZED_HEADERS,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Valida Bearer token e retorna usuário ativo do banco."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = parse_token_subject(payload)
        token_barbershop_id = UUID(payload["barbershop_id"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _unauthorized() from None

    user = (
        db.query(User)
        .options(joinedload(User.barbershop))
        .filter(User.id == user_id)
        .first()
    )

    if user is None or not user.is_active:
        raise _unauthorized()

    if user.barbershop_id != token_barbershop_id:
        raise _unauthorized()

    return user


def require_roles(*roles: UserRole):
    """Factory — exige que o usuário autenticado possua uma das roles."""

    def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente.",
            )
        return user

    return _dependency


require_owner = require_roles(UserRole.OWNER)
require_owner_or_receptionist = require_roles(UserRole.OWNER, UserRole.RECEPTIONIST)
