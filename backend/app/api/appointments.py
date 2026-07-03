"""Rotas HTTP — agendamentos internos."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.enums import AppointmentStatus
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.services import appointment as appointment_service

router = APIRouter()


@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    date: date | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    barber_id: UUID | None = Query(default=None),
    status: AppointmentStatus | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AppointmentResponse]:
    """Lista agendamentos da barbearia autenticada."""
    return appointment_service.list_appointments(
        db,
        current_user,
        date=date,
        date_from=date_from,
        date_to=date_to,
        barber_id=barber_id,
        status_filter=status,
    )


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentResponse:
    """Cria agendamento interno."""
    return appointment_service.create_appointment(db, current_user, data)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentResponse:
    """Obtém agendamento por ID."""
    return appointment_service.get_appointment(db, current_user, appointment_id)


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: UUID,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentResponse:
    """Atualiza agendamento."""
    return appointment_service.update_appointment(db, current_user, appointment_id, data)


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentResponse:
    """Cancela agendamento."""
    return appointment_service.cancel_appointment(db, current_user, appointment_id)
