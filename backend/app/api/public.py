"""Rotas HTTP — agendamento público."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.booking_agent import BookingAgentMessageRequest, BookingAgentResponse
from app.schemas.appointment import AvailableSlotsResponse
from app.schemas.public import (
    PublicAppointmentCreate,
    PublicAppointmentResponse,
    PublicBarberResponse,
    PublicBarbershopResponse,
    PublicBarbershopSearchResult,
    PublicServiceResponse,
)
from app.services.booking_agent.orchestrator import handle_agent_message, handle_home_agent_message
from app.services import appointment as appointment_service
from app.services import public_booking as public_service
from app.services.public_booking import check_booking_readiness, get_barbershop_by_slug
from app.services.slot_calculator import compute_available_slots

router = APIRouter()


@router.get("", response_model=list[PublicBarbershopSearchResult])
def search_public_barbershops(
    search: str = Query(default=""),
    db: Session = Depends(get_db),
) -> list[PublicBarbershopSearchResult]:
    """Busca barbearias aptas para agendamento público."""
    return public_service.search_booking_ready_barbershops(db, search)


@router.post("/{slug}/booking-agent/messages", response_model=BookingAgentResponse)
def booking_agent_message(
    slug: str,
    data: BookingAgentMessageRequest,
    db: Session = Depends(get_db),
) -> BookingAgentResponse:
    """Assistente conversacional de agendamento público."""
    return handle_agent_message(db, slug, data)


@router.get("/{slug}", response_model=PublicBarbershopResponse)
def get_public_barbershop(
    slug: str,
    db: Session = Depends(get_db),
) -> PublicBarbershopResponse:
    """Dados públicos da barbearia."""
    return public_service.get_public_barbershop(db, slug)


@router.get("/{slug}/services", response_model=list[PublicServiceResponse])
def list_public_services(
    slug: str,
    db: Session = Depends(get_db),
) -> list[PublicServiceResponse]:
    """Serviços ativos da barbearia."""
    return public_service.list_public_services(db, slug)


@router.get("/{slug}/barbers", response_model=list[PublicBarberResponse])
def list_public_barbers(
    slug: str,
    db: Session = Depends(get_db),
) -> list[PublicBarberResponse]:
    """Barbeiros ativos da barbearia."""
    return public_service.list_public_barbers(db, slug)


@router.get("/{slug}/slots", response_model=AvailableSlotsResponse)
def get_public_slots(
    slug: str,
    service_id: UUID = Query(...),
    barber_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    days: int = Query(default=7, ge=1, le=28),
    limit: int | None = Query(default=5, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AvailableSlotsResponse:
    """Horários disponíveis para agendamento público."""
    barbershop = get_barbershop_by_slug(db, slug)
    ready, message = check_booking_readiness(db, barbershop.id)
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=message)

    return compute_available_slots(
        db,
        barbershop_id=barbershop.id,
        service_id=service_id,
        barber_id=barber_id,
        date_from=date_from,
        days=days,
        limit=limit,
    )


@router.post("/{slug}/appointments", response_model=PublicAppointmentResponse)
def create_public_appointment(
    slug: str,
    data: PublicAppointmentCreate,
    db: Session = Depends(get_db),
) -> PublicAppointmentResponse:
    """Cria agendamento pela página pública."""
    barbershop = get_barbershop_by_slug(db, slug)
    ready, message = check_booking_readiness(db, barbershop.id)
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=message)

    appointment = appointment_service.create_public_appointment(
        db,
        barbershop,
        service_id=data.service_id,
        barber_id=data.barber_id,
        starts_at=data.starts_at,
        client_name=data.client_name,
        client_whatsapp=data.client_whatsapp,
    )

    return PublicAppointmentResponse(
        id=appointment.id,
        service_name=appointment.service.name,
        barber_name=appointment.barber.name,
        starts_at=appointment.starts_at,
        ends_at=appointment.ends_at,
        client_name=data.client_name,
        confirmation_message=appointment.confirmation_message or "",
    )
