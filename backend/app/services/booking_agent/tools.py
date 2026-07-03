"""Ferramentas controladas do agente — sempre com dados reais."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.barbershop import Barbershop
from app.models.service import Service
from app.services import appointment as appointment_service
from app.services import public_booking as public_booking_service
from app.services.booking_agent.session import BookingSessionState, SlotSelection
from app.services.slot_calculator import LOCAL_TZ, compute_available_slots

TZ = LOCAL_TZ


_WEEKDAY_NAMES = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
]


def _format_slot_label(starts_at: datetime, barber_name: str, show_barber: bool) -> str:
    local = starts_at.astimezone(TZ)
    weekday = _WEEKDAY_NAMES[local.weekday()]
    base = f"{weekday}, {local.strftime('%d/%m')} às {local.strftime('%H:%M')}"
    if show_barber:
        return f"{base} · {barber_name}"
    return base


def list_active_services(db: Session, barbershop_id: UUID) -> list[dict]:
    """Lista serviços ativos da barbearia."""
    services = (
        db.query(Service)
        .filter(Service.barbershop_id == barbershop_id, Service.is_active.is_(True))
        .order_by(Service.name.asc())
        .all()
    )
    return [
        {
            "id": s.id,
            "name": s.name,
            "duration_minutes": s.duration_minutes,
            "price": str(s.price),
        }
        for s in services
    ]


def list_active_barbers(db: Session, slug: str) -> list[dict]:
    """Lista barbeiros ativos da barbearia (dados reais, sem inventar)."""
    from app.models.enums import UserRole
    from app.models.user import User

    barbershop = public_booking_service.get_barbershop_by_slug(db, slug)
    barbers = (
        db.query(User)
        .filter(
            User.barbershop_id == barbershop.id,
            User.role == UserRole.BARBER,
            User.is_active.is_(True),
        )
        .order_by(User.name.asc())
        .all()
    )
    return [{"id": b.id, "name": b.name} for b in barbers]


def fetch_available_slots(
    db: Session,
    state: BookingSessionState,
    *,
    view: str = "next5",
    date_from: date | None = None,
    days: int | None = None,
    limit: int | None = None,
) -> list[SlotSelection]:
    """Consulta horários reais disponíveis."""
    if state.service_id is None or state.barbershop_id is None:
        return []

    if view == "next5":
        resolved_days, resolved_limit = 7, 5
    elif view == "week":
        resolved_days, resolved_limit = 7, 100
    else:
        resolved_days, resolved_limit = 7, 100

    if days is not None:
        resolved_days = days
    if limit is not None:
        resolved_limit = limit

    barber_id = None if state.barber_any else state.barber_id
    result = compute_available_slots(
        db,
        barbershop_id=state.barbershop_id,
        service_id=state.service_id,
        barber_id=barber_id,
        date_from=date_from or state.week_date_from,
        days=resolved_days,
        limit=resolved_limit,
    )

    if not result.slots and view == "next5" and date_from is None and days is None:
        next_start = result.week_end.astimezone(TZ).date() + timedelta(days=1)
        state.week_date_from = next_start
        result = compute_available_slots(
            db,
            barbershop_id=state.barbershop_id,
            service_id=state.service_id,
            barber_id=barber_id,
            date_from=next_start,
            days=7,
            limit=resolved_limit,
        )

    show_barber = state.barber_any
    slots: list[SlotSelection] = []
    for item in result.slots:
        slots.append(
            SlotSelection(
                barber_id=item.barber_id,
                barber_name=item.barber_name,
                starts_at=item.starts_at,
                ends_at=item.ends_at,
                label=_format_slot_label(item.starts_at, item.barber_name, show_barber),
            ),
        )
    state.current_slots = slots
    return slots


def confirm_booking(
    db: Session,
    barbershop: Barbershop,
    state: BookingSessionState,
) -> str:
    """Confirma agendamento com revalidação atômica."""
    if (
        state.service_id is None
        or state.selected_slot is None
        or not state.client_name
        or not state.client_whatsapp
    ):
        raise ValueError("Dados incompletos para confirmação.")

    appointment = appointment_service.create_public_appointment(
        db,
        barbershop,
        service_id=state.service_id,
        barber_id=state.selected_slot.barber_id,
        starts_at=state.selected_slot.starts_at,
        client_name=state.client_name,
        client_whatsapp=state.client_whatsapp,
    )
    return appointment.confirmation_message or ""
