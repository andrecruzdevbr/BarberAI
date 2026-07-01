"""Serviços de autenticação e onboarding SaaS."""

import re
import unicodedata

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.security import (
    INVALID_CREDENTIALS_MESSAGE,
    create_access_token,
    hash_password,
    normalize_email,
    verify_password,
)
from app.models.barbershop import Barbershop
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse


def slugify(text: str) -> str:
    """Gera slug URL-safe a partir do nome da barbearia."""
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^\w\s-]", "", ascii_text.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    return (slug[:100] if slug else "barbearia")


def generate_unique_slug(db: Session, barbershop_name: str) -> str:
    """Gera slug único, acrescentando sufixo numérico se necessário."""
    base_slug = slugify(barbershop_name)
    candidate = base_slug
    suffix = 2

    while db.query(Barbershop.id).filter(Barbershop.slug == candidate).first():
        candidate = f"{base_slug}-{suffix}"
        suffix += 1

    return candidate


def build_auth_response(user: User) -> AuthResponse:
    """Monta resposta de autenticação sem expor password_hash."""
    token = create_access_token(user)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


def register_barbershop(db: Session, data: RegisterRequest) -> AuthResponse:
    """Cria barbearia + usuário owner em transação única."""
    email = normalize_email(str(data.email))

    if db.query(User.id).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está cadastrado.",
        )

    slug = generate_unique_slug(db, data.barbershop_name)

    barbershop = Barbershop(
        name=data.barbershop_name.strip(),
        slug=slug,
        phone=data.phone.strip() if data.phone else None,
    )
    user = User(
        name=data.owner_name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role=UserRole.OWNER,
        is_active=True,
        barbershop=barbershop,
    )

    try:
        db.add(barbershop)
        db.add(user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está cadastrado.",
        ) from None

    db.refresh(user)
    user = (
        db.query(User)
        .options(joinedload(User.barbershop))
        .filter(User.id == user.id)
        .one()
    )
    return build_auth_response(user)


def login_user(db: Session, data: LoginRequest) -> AuthResponse:
    """Autentica usuário por e-mail e senha."""
    email = normalize_email(str(data.email))

    user = (
        db.query(User)
        .options(joinedload(User.barbershop))
        .filter(User.email == email)
        .first()
    )

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_MESSAGE,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_MESSAGE,
            headers={"WWW-Authenticate": "Bearer"},
        )

    return build_auth_response(user)


def get_authenticated_user_profile(user: User) -> UserResponse:
    """Retorna perfil seguro do usuário autenticado."""
    return UserResponse.model_validate(user)
