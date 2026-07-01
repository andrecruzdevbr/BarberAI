"""Schemas Pydantic — contratos de autenticação."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class RegisterRequest(BaseModel):
    """Payload de cadastro de barbearia + dono."""

    owner_name: str = Field(min_length=2, max_length=255)
    barbershop_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """Payload de login."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class BarbershopBrief(BaseModel):
    """Dados públicos da barbearia."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str


class UserResponse(BaseModel):
    """Dados seguros do usuário autenticado."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    role: UserRole
    barbershop: BarbershopBrief


class AuthResponse(BaseModel):
    """Resposta de login ou registro bem-sucedido."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
