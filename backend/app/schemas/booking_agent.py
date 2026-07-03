"""Schemas Pydantic — agente de agendamento público."""

from pydantic import BaseModel, Field, field_validator


class BookingAgentMessageRequest(BaseModel):
    """Mensagem enviada pelo cliente ao assistente."""

    session_id: str | None = None
    message: str = Field(default="")

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        return value.strip()


class BookingAgentChoice(BaseModel):
    """Opção clicável apresentada ao cliente."""

    label: str
    action: str
    description: str | None = None


class BookingSlotCard(BaseModel):
    """Card de horário disponível."""

    label: str
    action: str
    barber_name: str | None = None


class BookingSummary(BaseModel):
    """Resumo parcial ou final do agendamento."""

    service: str | None = None
    barber: str | None = None
    date: str | None = None
    time: str | None = None
    client_name: str | None = None
    client_whatsapp: str | None = None


class BookingAgentResponse(BaseModel):
    """Resposta do assistente de agendamento."""

    session_id: str
    assistant_message: str
    step: str
    choices: list[BookingAgentChoice] = []
    slot_cards: list[BookingSlotCard] = []
    booking_summary: BookingSummary = Field(default_factory=BookingSummary)
    requires_confirmation: bool = False
