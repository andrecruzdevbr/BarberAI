"""Orquestrador do agente de agendamento público."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.schemas.booking_agent import BookingAgentMessageRequest, BookingAgentResponse
from app.services.booking_agent.home_provider import HomeLocalBookingAgentProvider
from app.services.booking_agent.llm_provider import LLMBookingAgentProvider
from app.services.booking_agent.local_provider import LocalBookingAgentProvider
from app.services.booking_agent.provider import BookingAgentProvider
from app.services.booking_agent.session import create_home_session, create_session, get_session
from app.services.public_booking import get_barbershop_by_slug


def _get_provider() -> BookingAgentProvider:
    settings = get_settings()
    if settings.booking_agent_mode == "llm":
        return LLMBookingAgentProvider()
    return LocalBookingAgentProvider()


def handle_agent_message(
    db: Session,
    slug: str,
    data: BookingAgentMessageRequest,
) -> BookingAgentResponse:
    """Processa mensagem do cliente no assistente de agendamento."""
    try:
        barbershop = get_barbershop_by_slug(db, slug)
    except HTTPException:
        raise

    message = data.message
    is_start = message in ("", "__start__")

    if data.session_id:
        state = get_session(data.session_id)
        if state is None or state.slug != slug:
            if not is_start:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Sessão expirada. Recarregue a página.",
                )
            state = create_session(
                barbershop_id=barbershop.id,
                slug=slug,
                barbershop_name=barbershop.name,
            )
    else:
        state = create_session(
            barbershop_id=barbershop.id,
            slug=slug,
            barbershop_name=barbershop.name,
        )

    provider = _get_provider()
    return provider.handle_message(db, barbershop, state, message)


def handle_home_agent_message(
    db: Session,
    data: BookingAgentMessageRequest,
) -> BookingAgentResponse:
    """Processa mensagem do assistente na home sem barbearia definida."""
    message = data.message
    is_start = message in ("", "__start__")

    if data.session_id:
        state = get_session(data.session_id)
        if state is None:
            if not is_start:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Sessão expirada. Recarregue a página.",
                )
            state = create_home_session()
    else:
        state = create_home_session()

    provider = HomeLocalBookingAgentProvider()
    return provider.handle_message(db, state, message)
