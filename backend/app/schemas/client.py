"""Schemas Pydantic — contratos de clientes."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ClientCreate(BaseModel):
    """Payload de criação de cliente."""

    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=1, max_length=20)
    email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("full_name", "phone")
    @classmethod
    def strip_required_fields(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Campo obrigatório não pode ser vazio.")
        return stripped


class ClientUpdate(BaseModel):
    """Payload de atualização de cliente."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=1, max_length=20)
    email: EmailStr | None = None
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None

    @field_validator("full_name", "phone")
    @classmethod
    def strip_optional_required(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Campo não pode ser vazio.")
        return stripped


class ClientResponse(BaseModel):
    """Resposta segura de cliente."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    phone: str
    email: EmailStr | None
    notes: str | None
    is_active: bool
