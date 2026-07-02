"""Schemas Pydantic — equipe."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.phone import normalize_and_validate_whatsapp
from app.models.enums import UserRole


class TeamMemberCreate(BaseModel):
    """Payload de criação de membro da equipe."""

    name: str = Field(min_length=2, max_length=255)
    whatsapp: str = Field(min_length=10, max_length=20)
    email: EmailStr
    temporary_password: str = Field(min_length=8, max_length=128)
    role: UserRole

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nome não pode ser vazio.")
        return stripped

    @field_validator("whatsapp")
    @classmethod
    def normalize_whatsapp_field(cls, value: str) -> str:
        return normalize_and_validate_whatsapp(value)

    @field_validator("role")
    @classmethod
    def only_staff_roles(cls, value: UserRole) -> UserRole:
        if value not in (UserRole.BARBER, UserRole.RECEPTIONIST):
            raise ValueError("Somente barbeiro ou recepcionista podem ser criados.")
        return value


class TeamMemberUpdate(BaseModel):
    """Payload de atualização de membro da equipe (owner)."""

    name: str | None = Field(default=None, min_length=2, max_length=255)
    whatsapp: str | None = Field(default=None, min_length=10, max_length=20)
    role: UserRole | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nome não pode ser vazio.")
        return stripped

    @field_validator("whatsapp")
    @classmethod
    def normalize_whatsapp_field(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_and_validate_whatsapp(value)

    @field_validator("role")
    @classmethod
    def only_staff_roles(cls, value: UserRole | None) -> UserRole | None:
        if value is not None and value not in (UserRole.BARBER, UserRole.RECEPTIONIST):
            raise ValueError("Role deve ser barbeiro ou recepcionista.")
        return value


class TeamMemberSelfUpdate(BaseModel):
    """Atualização limitada do próprio perfil (barbeiro/recepcionista)."""

    name: str | None = Field(default=None, min_length=2, max_length=255)
    whatsapp: str | None = Field(default=None, min_length=10, max_length=20)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nome não pode ser vazio.")
        return stripped

    @field_validator("whatsapp")
    @classmethod
    def normalize_whatsapp_field(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_and_validate_whatsapp(value)


class TeamMemberResponse(BaseModel):
    """Resposta segura de membro da equipe."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    whatsapp: str | None
    role: UserRole
    is_active: bool
    created_at: datetime
