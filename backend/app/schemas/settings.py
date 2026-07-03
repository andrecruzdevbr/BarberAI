"""Schemas Pydantic — configurações da barbearia."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_and_validate_whatsapp


class BarbershopSettingsResponse(BaseModel):
    """Dados configuráveis da barbearia autenticada."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    whatsapp: str | None
    booking_ready: bool = False
    booking_message: str | None = None


class BarbershopSettingsUpdate(BaseModel):
    """Atualização segura de dados da barbearia."""

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
