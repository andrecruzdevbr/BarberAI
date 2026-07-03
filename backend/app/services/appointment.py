"""Serviços de negócio — agendamentos."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment
from app.models.barbershop import Barbershop
from app.models.client import Client
from app.models.enums import AppointmentStatus, UserRole
from app.models.service import Service
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.services.confirmation import attach_confirmation_message
from app.services.slot_calculator import LOCAL_TZ, compute_available_slots, is_slot_available

LOCAL_TZ_INFO = LOCAL_TZ


def _upsert_client(
    db: Session,
    barbershop_id: UUID,
    name: str,
    whatsapp: str,
) -> Client:
    client = (
        db.query(Client)
        .filter(Client.barbershop_id == barbershop_id, Client.phone == whatsapp)
        .first()
    )
    if client is None:
        client = Client(
            barbershop_id=barbershop_id,
            full_name=name.strip(),
            phone=whatsapp,
            is_active=True,
        )
        db.add(client)
        db.flush()
    elif client.full_name != name.strip():
        client.full_name = name.strip()
        db.flush()
    return client


def _resolve_barber_id(user: User, requested: UUID | None) -> UUID:
    if user.role == UserRole.BARBER:
        return user.id
    if requested is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Barbeiro é obrigatório.",
        )
    return requested


def _assert_barber_in_shop(db: Session, barbershop_id: UUID, barber_id: UUID) -> User:
    barber = (
        db.query(User)
        .filter(
            User.id == barber_id,
            User.barbershop_id == barbershop_id,
            User.role == UserRole.BARBER,
            User.is_active.is_(True),
        )
        .first()
    )
    if barber is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barbeiro não encontrado.",
        )
    return barber


def _get_service_or_404(db: Session, barbershop_id: UUID, service_id: UUID) -> Service:
    service = (
        db.query(Service)
        .filter(
            Service.id == service_id,
            Service.barbershop_id == barbershop_id,
            Service.is_active.is_(True),
        )
        .first()
    )
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Serviço não encontrado.",
        )
    return service


def _check_overlap(db: Session, barber_id: UUID, starts_at: datetime, ends_at: datetime) -> None:
    conflict = (
        db.query(Appointment.id)
        .filter(
            Appointment.barber_id == barber_id,
            Appointment.status == AppointmentStatus.SCHEDULED,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
        )
        .with_for_update()
        .first()
    )
    if conflict is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Horário já reservado.",
        )


def _to_response(appointment: Appointment) -> AppointmentResponse:
    return AppointmentResponse.model_validate(appointment)


def list_appointments(
    db: Session,
    user: User,
    *,
    date: date | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    barber_id: UUID | None = None,
    status_filter: AppointmentStatus | None = None,
) -> list[AppointmentResponse]:
    """Lista agendamentos com filtros e isolamento por tenant."""
    query = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.client),
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
        )
        .filter(Appointment.barbershop_id == user.barbershop_id)
    )

    if user.role == UserRole.BARBER:
        query = query.filter(Appointment.barber_id == user.id)
    elif barber_id is not None:
        query = query.filter(Appointment.barber_id == barber_id)

    if date is not None:
        day_start = datetime.combine(date, datetime.min.time(), tzinfo=LOCAL_TZ)
        day_end = day_start + timedelta(days=1)
        query = query.filter(Appointment.starts_at >= day_start, Appointment.starts_at < day_end)
    else:
        if date_from is not None:
            start = datetime.combine(date_from, datetime.min.time(), tzinfo=LOCAL_TZ)
            query = query.filter(Appointment.starts_at >= start)
        if date_to is not None:
            end = datetime.combine(date_to + timedelta(days=1), datetime.min.time(), tzinfo=LOCAL_TZ)
            query = query.filter(Appointment.starts_at < end)

    if status_filter is not None:
        query = query.filter(Appointment.status == status_filter)

    rows = query.order_by(Appointment.starts_at.asc()).all()
    return [_to_response(row) for row in rows]


def get_appointment(db: Session, user: User, appointment_id: UUID) -> AppointmentResponse:
    """Obtém agendamento por ID."""
    appointment = _get_appointment_or_404(db, user, appointment_id)
    return _to_response(appointment)


def create_appointment(
    db: Session,
    user: User,
    data: AppointmentCreate,
) -> AppointmentResponse:
    """Cria agendamento com validação atômica."""
    barber_id = _resolve_barber_id(user, data.barber_id)
    barber = _assert_barber_in_shop(db, user.barbershop_id, barber_id)
    service = _get_service_or_404(db, user.barbershop_id, data.service_id)

    starts_at = data.starts_at
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=LOCAL_TZ)
    ends_at = starts_at + timedelta(minutes=service.duration_minutes)

    if not is_slot_available(
        db,
        barbershop_id=user.barbershop_id,
        service_id=service.id,
        barber_id=barber_id,
        starts_at=starts_at,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Horário indisponível.",
        )

    try:
        _check_overlap(db, barber_id, starts_at, ends_at)
        client = _upsert_client(db, user.barbershop_id, data.client_name, data.client_whatsapp)
        barbershop = db.query(Barbershop).filter(Barbershop.id == user.barbershop_id).one()

        appointment = Appointment(
            barbershop_id=user.barbershop_id,
            client_id=client.id,
            barber_id=barber_id,
            service_id=service.id,
            starts_at=starts_at,
            ends_at=ends_at,
            status=AppointmentStatus.SCHEDULED,
            notes=data.notes,
        )
        attach_confirmation_message(
            appointment,
            client=client,
            barbershop=barbershop,
            service=service,
            barber=barber,
        )
        db.add(appointment)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    db.refresh(appointment)
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.client),
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
        )
        .filter(Appointment.id == appointment.id)
        .one()
    )
    return _to_response(appointment)


def update_appointment(
    db: Session,
    user: User,
    appointment_id: UUID,
    data: AppointmentUpdate,
) -> AppointmentResponse:
    """Atualiza status ou observações do agendamento."""
    appointment = _get_appointment_or_404(db, user, appointment_id)
    _assert_can_manage(user, appointment)

    updates = data.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] is not None:
        appointment.status = updates["status"]
    if "notes" in updates:
        appointment.notes = updates["notes"]

    db.commit()
    db.refresh(appointment)
    return _to_response(appointment)


def cancel_appointment(db: Session, user: User, appointment_id: UUID) -> AppointmentResponse:
    """Cancela agendamento (libera horário)."""
    appointment = _get_appointment_or_404(db, user, appointment_id)
    _assert_can_manage(user, appointment)

    if appointment.status == AppointmentStatus.CANCELLED:
        return _to_response(appointment)

    appointment.status = AppointmentStatus.CANCELLED
    db.commit()
    db.refresh(appointment)
    return _to_response(appointment)


def create_public_appointment(
    db: Session,
    barbershop: Barbershop,
    *,
    service_id: UUID,
    barber_id: UUID,
    starts_at: datetime,
    client_name: str,
    client_whatsapp: str,
) -> Appointment:
    """Cria agendamento público com validação atômica."""
    service = _get_service_or_404(db, barbershop.id, service_id)
    barber = _assert_barber_in_shop(db, barbershop.id, barber_id)

    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=LOCAL_TZ)
    ends_at = starts_at + timedelta(minutes=service.duration_minutes)

    if not is_slot_available(
        db,
        barbershop_id=barbershop.id,
        service_id=service.id,
        barber_id=barber_id,
        starts_at=starts_at,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Horário indisponível. Escolha outro horário.",
        )

    try:
        _check_overlap(db, barber_id, starts_at, ends_at)
        client = _upsert_client(db, barbershop.id, client_name, client_whatsapp)
        appointment = Appointment(
            barbershop_id=barbershop.id,
            client_id=client.id,
            barber_id=barber_id,
            service_id=service.id,
            starts_at=starts_at,
            ends_at=ends_at,
            status=AppointmentStatus.SCHEDULED,
        )
        attach_confirmation_message(
            appointment,
            client=client,
            barbershop=barbershop,
            service=service,
            barber=barber,
        )
        db.add(appointment)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    db.refresh(appointment)
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.client),
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
        )
        .filter(Appointment.id == appointment.id)
        .one()
    )
    return appointment


def _get_appointment_or_404(db: Session, user: User, appointment_id: UUID) -> Appointment:
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.client),
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
        )
        .filter(
            Appointment.id == appointment_id,
            Appointment.barbershop_id == user.barbershop_id,
        )
        .first()
    )
    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento não encontrado.",
        )
    if user.role == UserRole.BARBER and appointment.barber_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente.",
        )
    return appointment


def _assert_can_manage(user: User, appointment: Appointment) -> None:
    if user.role == UserRole.OWNER:
        return
    if user.role == UserRole.RECEPTIONIST:
        return
    if user.role == UserRole.BARBER and appointment.barber_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permissão insuficiente.",
    )
