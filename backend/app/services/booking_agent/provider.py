"""Interface do provedor do agente de agendamento."""

from abc import ABC, abstractmethod

from sqlalchemy.orm import Session

from app.models.barbershop import Barbershop
from app.schemas.booking_agent import BookingAgentResponse
from app.services.booking_agent.session import BookingSessionState


class BookingAgentProvider(ABC):
    """Contrato para modos local e LLM do assistente."""

    @abstractmethod
    def handle_message(
        self,
        db: Session,
        barbershop: Barbershop,
        state: BookingSessionState,
        message: str,
    ) -> BookingAgentResponse:
        """Processa mensagem do cliente e retorna resposta estruturada."""
