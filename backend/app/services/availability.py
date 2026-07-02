"""Serviços de negócio — disponibilidade de barbeiros."""

from collections import defaultdict
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.barber_availability import BarberAvailability
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.availability import AvailabilitySlotInput, AvailabilitySlotResponse


def list_availability(
    db: Session,
    user: User,
    barber_id: UUID,
) -> list[AvailabilitySlotResponse]:
    """Lista disponibilidade semanal de um barbeiro."""
    barber = _get_barber_or_404(db, user, barber_id)
    _assert_can_view_availability(user, barber)

    slots = (
        db.query(BarberAvailability)
        .filter(
            BarberAvailability.barber_id == barber_id,
            BarberAvailability.barbershop_id == user.barbershop_id,
        )
        .order_by(
            BarberAvailability.weekday.asc(),
            BarberAvailability.start_time.asc(),
        )
        .all()
    )
    return [AvailabilitySlotResponse.model_validate(s) for s in slots]


def replace_availability(
    db: Session,
    user: User,
    barber_id: UUID,
    slots: list[AvailabilitySlotInput],
) -> list[AvailabilitySlotResponse]:
    """Substitui atomicamente a disponibilidade semanal de um barbeiro."""
    if user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente.",
        )

    barber = _get_barber_or_404(db, user, barber_id)

    if barber.role != UserRole.BARBER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Somente barbeiros podem possuir disponibilidade.",
        )

    _validate_no_overlaps(slots)

    try:
        db.query(BarberAvailability).filter(
            BarberAvailability.barber_id == barber_id,
            BarberAvailability.barbershop_id == user.barbershop_id,
        ).delete(synchronize_session="fetch")

        created: list[BarberAvailability] = []
        for slot in slots:
            record = BarberAvailability(
                barbershop_id=user.barbershop_id,
                barber_id=barber_id,
                weekday=slot.weekday,
                start_time=slot.start_time,
                end_time=slot.end_time,
                is_active=slot.is_active,
            )
            db.add(record)
            created.append(record)

        db.commit()
        for record in created:
            db.refresh(record)
    except Exception:
        db.rollback()
        raise

    created.sort(key=lambda s: (s.weekday, s.start_time))
    return [AvailabilitySlotResponse.model_validate(s) for s in created]


def _validate_no_overlaps(slots: list[AvailabilitySlotInput]) -> None:
    by_weekday: dict[int, list[AvailabilitySlotInput]] = defaultdict(list)
    for slot in slots:
        by_weekday[slot.weekday].append(slot)

    weekday_names = [
        "segunda-feira",
        "terça-feira",
        "quarta-feira",
        "quinta-feira",
        "sexta-feira",
        "sábado",
        "domingo",
    ]

    for weekday, day_slots in by_weekday.items():
        sorted_slots = sorted(day_slots, key=lambda s: s.start_time)
        for index in range(len(sorted_slots) - 1):
            current = sorted_slots[index]
            next_slot = sorted_slots[index + 1]
            if current.end_time > next_slot.start_time:
                day_name = weekday_names[weekday]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Horários sobrepostos em {day_name}.",
                )


def _get_barber_or_404(db: Session, user: User, barber_id: UUID) -> User:
    barber = (
        db.query(User)
        .filter(User.id == barber_id, User.barbershop_id == user.barbershop_id)
        .first()
    )
    if barber is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barbeiro não encontrado.",
        )
    return barber


def _assert_can_view_availability(current: User, barber: User) -> None:
    if current.role == UserRole.OWNER:
        return
    if current.role == UserRole.BARBER and current.id == barber.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permissão insuficiente.",
    )
