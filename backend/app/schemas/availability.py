"""Schemas Pydantic — disponibilidade de barbeiros."""

from datetime import time

from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID


class AvailabilitySlotInput(BaseModel):
    """Intervalo de disponibilidade enviado pelo cliente."""

    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    is_active: bool = True

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, end_time: time, info) -> time:
        start_time = info.data.get("start_time")
        if start_time is not None and end_time <= start_time:
            raise ValueError("Horário final deve ser posterior ao inicial.")
        return end_time


class AvailabilitySlotResponse(BaseModel):
    """Intervalo de disponibilidade retornado pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    weekday: int
    start_time: time
    end_time: time
    is_active: bool


class AvailabilityInterpretRequest(BaseModel):
    """Mensagem em linguagem natural para interpretação de horários."""

    message: str = Field(min_length=3, max_length=2000)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Mensagem não pode ser vazia.")
        return stripped


class AvailabilityInterpretSlot(BaseModel):
    """Intervalo interpretado (ainda não persistido)."""

    weekday: int
    start_time: time
    end_time: time
    is_active: bool = True


class AvailabilityInterpretResponse(BaseModel):
    """Resultado da interpretação — requer confirmação antes de salvar."""

    slots: list[AvailabilityInterpretSlot]
    warnings: list[str]
    requires_confirmation: bool = True
    message: str | None = None
