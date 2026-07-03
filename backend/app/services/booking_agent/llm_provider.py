"""Provedor LLM do agente — usa API externa quando configurada."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.barbershop import Barbershop
from app.schemas.booking_agent import BookingAgentResponse
from app.services.booking_agent.local_provider import LocalBookingAgentProvider
from app.services.booking_agent.provider import BookingAgentProvider
from app.services.booking_agent.session import BookingSessionState

logger = logging.getLogger(__name__)


class LLMBookingAgentProvider(BookingAgentProvider):
    """Delega ao LLM quando configurado; caso contrário usa modo local."""

    def __init__(self) -> None:
        self._fallback = LocalBookingAgentProvider()

    def handle_message(
        self,
        db: Session,
        barbershop: Barbershop,
        state: BookingSessionState,
        message: str,
    ) -> BookingAgentResponse:
        settings = get_settings()
        if not settings.booking_agent_api_key or not settings.booking_agent_api_base_url:
            logger.info("LLM não configurado — usando modo local.")
            return self._fallback.handle_message(db, barbershop, state, message)

        # Integração LLM com ferramentas controladas — extensível no futuro.
        # Por segurança, enquanto não houver implementação completa, usa fallback local.
        return self._fallback.handle_message(db, barbershop, state, message)
