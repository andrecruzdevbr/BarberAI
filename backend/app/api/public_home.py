"""Rotas HTTP — agente de agendamento na home."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.booking_agent import BookingAgentMessageRequest, BookingAgentResponse
from app.services.booking_agent.orchestrator import handle_home_agent_message

router = APIRouter()


@router.post("/messages", response_model=BookingAgentResponse)
def home_booking_agent_message(
    data: BookingAgentMessageRequest,
    db: Session = Depends(get_db),
) -> BookingAgentResponse:
    """Assistente conversacional na home sem barbearia definida."""
    return handle_home_agent_message(db, data)
