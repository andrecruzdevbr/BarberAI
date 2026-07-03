"""Schemas Pydantic — agendamento público."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_and_validate_whatsapp


class PublicBarbershopResponse(BaseModel):
    """Dados públicos mínimos da barbearia."""

    name: str
    slug: str
    whatsapp: str | None
    booking_ready: bool
    booking_message: str | None = None


class PublicBarbershopSearchResult(BaseModel):
    """Resultado mínimo da busca pública de barbearias."""

    name: str
    slug: str


class PublicServiceResponse(BaseModel):
    """Serviço visível publicamente."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    duration_minutes: int
    price: str


class PublicBarberResponse(BaseModel):
    """Barbeiro visível publicamente."""

    id: UUID
    name: str


class PublicAppointmentCreate(BaseModel):
    """Payload de agendamento pela página pública."""

    service_id: UUID
    barber_id: UUID
    starts_at: datetime
    client_name: str = Field(min_length=1, max_length=255)
    client_whatsapp: str = Field(min_length=10, max_length=20)

    @field_validator("client_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nome completo é obrigatório.")
        return stripped

    @field_validator("client_whatsapp")
    @classmethod
    def normalize_whatsapp(cls, value: str) -> str:
        return normalize_and_validate_whatsapp(value)


class PublicAppointmentResponse(BaseModel):
    """Resposta mínima após agendamento público."""

    id: UUID
    service_name: str
    barber_name: str
    starts_at: datetime
    ends_at: datetime
    client_name: str
    confirmation_message: str
