"""Cálculo de horários disponíveis para agendamento."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.barber_availability import BarberAvailability
from app.models.enums import AppointmentStatus, UserRole
from app.models.service import Service
from app.models.user import User
from app.schemas.appointment import AvailableSlotResponse, AvailableSlotsResponse

LOCAL_TZ = ZoneInfo("America/Sao_Paulo")
SLOT_INTERVAL_MINUTES = 30
BLOCKING_STATUSES = (AppointmentStatus.SCHEDULED,)


def _local_now() -> datetime:
    return datetime.now(tz=LOCAL_TZ)


def _combine_local(day: date, t: time) -> datetime:
    return datetime.combine(day, t, tzinfo=LOCAL_TZ)


def _round_up_to_interval(dt: datetime, minutes: int = SLOT_INTERVAL_MINUTES) -> datetime:
    dt = dt.astimezone(LOCAL_TZ).replace(second=0, microsecond=0)
    remainder = dt.minute % minutes
    if remainder != 0:
        dt += timedelta(minutes=minutes - remainder)
    return dt


def _get_active_barbers(
    db: Session,
    barbershop_id: UUID,
    barber_id: UUID | None = None,
) -> list[User]:
    query = db.query(User).filter(
        User.barbershop_id == barbershop_id,
        User.role == UserRole.BARBER,
        User.is_active.is_(True),
    )
    if barber_id is not None:
        query = query.filter(User.id == barber_id)
    return query.all()


def _get_availability_map(
    db: Session,
    barbershop_id: UUID,
    barber_ids: list[UUID],
) -> dict[UUID, dict[int, list[tuple[time, time]]]]:
    records = (
        db.query(BarberAvailability)
        .filter(
            BarberAvailability.barbershop_id == barbershop_id,
            BarberAvailability.barber_id.in_(barber_ids),
            BarberAvailability.is_active.is_(True),
        )
        .all()
    )
    result: dict[UUID, dict[int, list[tuple[time, time]]]] = {}
    for record in records:
        result.setdefault(record.barber_id, {}).setdefault(record.weekday, []).append(
            (record.start_time, record.end_time),
        )
    return result


def _get_appointments_for_range(
    db: Session,
    barbershop_id: UUID,
    barber_ids: list[UUID],
    range_start: datetime,
    range_end: datetime,
) -> dict[UUID, list[tuple[datetime, datetime]]]:
    rows = (
        db.query(Appointment)
        .filter(
            Appointment.barbershop_id == barbershop_id,
            Appointment.barber_id.in_(barber_ids),
            Appointment.status.in_(BLOCKING_STATUSES),
            Appointment.starts_at < range_end,
            Appointment.ends_at > range_start,
        )
        .all()
    )
    result: dict[UUID, list[tuple[datetime, datetime]]] = {}
    for row in rows:
        result.setdefault(row.barber_id, []).append((row.starts_at, row.ends_at))
    return result


def _overlaps(
    start: datetime,
    end: datetime,
    existing: list[tuple[datetime, datetime]],
) -> bool:
    for ex_start, ex_end in existing:
        if start < ex_end and end > ex_start:
            return True
    return False


def _fits_in_windows(
    start: datetime,
    end: datetime,
    windows: list[tuple[time, time]],
) -> bool:
    local_start = start.astimezone(LOCAL_TZ).time()
    local_end = end.astimezone(LOCAL_TZ).time()
    for window_start, window_end in windows:
        if local_start >= window_start and local_end <= window_end:
            return True
    return False


def compute_available_slots(
    db: Session,
    *,
    barbershop_id: UUID,
    service_id: UUID,
    barber_id: UUID | None = None,
    date_from: date | None = None,
    days: int = 7,
    limit: int | None = 5,
) -> AvailableSlotsResponse:
    """Calcula horários disponíveis reais para um serviço."""
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
        return AvailableSlotsResponse(
            slots=[],
            week_start=_local_now(),
            week_end=_local_now(),
            message="Serviço não encontrado ou indisponível.",
        )

    barbers = _get_active_barbers(db, barbershop_id, barber_id)
    if not barbers:
        return AvailableSlotsResponse(
            slots=[],
            week_start=_local_now(),
            week_end=_local_now(),
            message="Nenhum barbeiro disponível.",
        )

    barber_ids = [b.id for b in barbers]
    availability = _get_availability_map(db, barbershop_id, barber_ids)

    barbers_with_availability = [
        b for b in barbers if availability.get(b.id)
    ]
    if not barbers_with_availability:
        return AvailableSlotsResponse(
            slots=[],
            week_start=_local_now(),
            week_end=_local_now(),
            message="Nenhum barbeiro com horários configurados.",
        )

    now = _local_now()
    start_day = date_from or now.date()
    range_start = _combine_local(start_day, time.min)
    range_end = _combine_local(start_day + timedelta(days=days - 1), time.max)

    appointments = _get_appointments_for_range(
        db, barbershop_id, [b.id for b in barbers_with_availability], range_start, range_end,
    )

    duration = timedelta(minutes=service.duration_minutes)
    interval = timedelta(minutes=SLOT_INTERVAL_MINUTES)
    candidates: list[AvailableSlotResponse] = []

    for offset in range(days):
        current_day = start_day + timedelta(days=offset)
        weekday = current_day.weekday()

        for barber in barbers_with_availability:
            day_windows = availability.get(barber.id, {}).get(weekday, [])
            if not day_windows:
                continue

            day_start = _combine_local(current_day, time.min)
            earliest = _round_up_to_interval(now) if current_day == now.date() else day_start

            for window_start, window_end in day_windows:
                window_start_dt = _combine_local(current_day, window_start)
                window_end_dt = _combine_local(current_day, window_end)
                cursor = max(window_start_dt, earliest)
                cursor = _round_up_to_interval(cursor)

                while cursor + duration <= window_end_dt:
                    slot_end = cursor + duration
                    barber_appts = appointments.get(barber.id, [])
                    if not _overlaps(cursor, slot_end, barber_appts):
                        candidates.append(
                            AvailableSlotResponse(
                                barber_id=barber.id,
                                barber_name=barber.name,
                                starts_at=cursor,
                                ends_at=slot_end,
                            ),
                        )
                    cursor += interval

    candidates.sort(key=lambda s: s.starts_at)

    if limit is not None:
        candidates = candidates[:limit]

    message = None
    if not candidates:
        message = "Nenhum horário disponível neste período."

    return AvailableSlotsResponse(
        slots=candidates,
        week_start=range_start,
        week_end=range_end,
        message=message,
    )


def is_slot_available(
    db: Session,
    *,
    barbershop_id: UUID,
    service_id: UUID,
    barber_id: UUID,
    starts_at: datetime,
) -> bool:
    """Verifica se um horário específico continua disponível."""
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=LOCAL_TZ)
    local_date = starts_at.astimezone(LOCAL_TZ).date()
    result = compute_available_slots(
        db,
        barbershop_id=barbershop_id,
        service_id=service_id,
        barber_id=barber_id,
        date_from=local_date,
        days=1,
        limit=None,
    )
    for slot in result.slots:
        if slot.starts_at.astimezone(LOCAL_TZ) == starts_at.astimezone(LOCAL_TZ):
            return True
    return False
