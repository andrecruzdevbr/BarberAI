"""Schemas Pydantic — contratos de serviços."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ServiceCreate(BaseModel):
    """Payload de criação de serviço."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    duration_minutes: int = Field(ge=10)
    price: Decimal = Field(gt=0, decimal_places=2)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nome do serviço não pode ser vazio.")
        return stripped


class ServiceUpdate(BaseModel):
    """Payload de atualização de serviço."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    duration_minutes: int | None = Field(default=None, ge=10)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nome do serviço não pode ser vazio.")
        return stripped


class ServiceResponse(BaseModel):
    """Resposta segura de serviço."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    duration_minutes: int
    price: Decimal
    is_active: bool
