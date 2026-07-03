"""Schemas Pydantic — agendamentos."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_and_validate_whatsapp
from app.models.enums import AppointmentStatus


class AppointmentClientBrief(BaseModel):
    """Cliente resumido no agendamento."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    phone: str


class AppointmentServiceBrief(BaseModel):
    """Serviço resumido no agendamento."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    duration_minutes: int


class AppointmentBarberBrief(BaseModel):
    """Barbeiro resumido no agendamento."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class AppointmentResponse(BaseModel):
    """Resposta segura de agendamento."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    barbershop_id: UUID
    client: AppointmentClientBrief
    barber: AppointmentBarberBrief
    service: AppointmentServiceBrief
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    notes: str | None
    confirmation_message: str | None
    created_at: datetime


class AppointmentCreate(BaseModel):
    """Payload de criação de agendamento interno."""

    service_id: UUID
    barber_id: UUID | None = None
    starts_at: datetime
    client_name: str = Field(min_length=1, max_length=255)
    client_whatsapp: str = Field(min_length=10, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("client_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nome do cliente não pode ser vazio.")
        return stripped

    @field_validator("client_whatsapp")
    @classmethod
    def normalize_whatsapp(cls, value: str) -> str:
        return normalize_and_validate_whatsapp(value)


class AppointmentUpdate(BaseModel):
    """Payload de atualização parcial de agendamento."""

    status: AppointmentStatus | None = None
    notes: str | None = Field(default=None, max_length=2000)


class AvailableSlotResponse(BaseModel):
    """Horário disponível para agendamento."""

    barber_id: UUID
    barber_name: str
    starts_at: datetime
    ends_at: datetime


class AvailableSlotsResponse(BaseModel):
    """Lista de horários disponíveis com metadados da consulta."""

    slots: list[AvailableSlotResponse]
    week_start: datetime
    week_end: datetime
    message: str | None = None
