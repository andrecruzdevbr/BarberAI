"""Serviços de agendamento público."""

from __future__ import annotations

import re
import unicodedata
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.barber_availability import BarberAvailability
from app.models.barbershop import Barbershop
from app.models.enums import UserRole
from app.models.service import Service
from app.models.user import User
from app.schemas.public import (
    PublicBarberResponse,
    PublicBarbershopResponse,
    PublicBarbershopSearchResult,
    PublicServiceResponse,
)

INCOMPLETE_BOOKING_MESSAGE = "Esta barbearia ainda não está recebendo agendamentos online."


def _normalize_search(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.lower().strip())
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.replace("-", " ")
    return re.sub(r"\s+", " ", text).strip()


def get_barbershop_by_slug(db: Session, slug: str) -> Barbershop:
    """Obtém barbearia por slug ou 404."""
    barbershop = db.query(Barbershop).filter(Barbershop.slug == slug).first()
    if barbershop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barbearia não encontrada.",
        )
    return barbershop


def check_booking_readiness(db: Session, barbershop_id: UUID) -> tuple[bool, str | None]:
    """Verifica se a barbearia está pronta para agendamento público."""
    barbershop = db.query(Barbershop).filter(Barbershop.id == barbershop_id).one()

    if not barbershop.is_active:
        return False, INCOMPLETE_BOOKING_MESSAGE

    # WhatsApp oficial só é exigido quando a integração real estiver ativada
    # (flag desligada por padrão em desenvolvimento/MVP).
    if get_settings().require_barbershop_whatsapp_for_public_booking and not barbershop.whatsapp:
        return False, INCOMPLETE_BOOKING_MESSAGE

    active_services = (
        db.query(Service.id)
        .filter(Service.barbershop_id == barbershop_id, Service.is_active.is_(True))
        .first()
    )
    if active_services is None:
        return False, INCOMPLETE_BOOKING_MESSAGE

    active_barbers = (
        db.query(User.id)
        .filter(
            User.barbershop_id == barbershop_id,
            User.role == UserRole.BARBER,
            User.is_active.is_(True),
        )
        .all()
    )
    if not active_barbers:
        return False, INCOMPLETE_BOOKING_MESSAGE

    barber_ids = [row.id for row in active_barbers]
    has_availability = (
        db.query(BarberAvailability.id)
        .filter(
            BarberAvailability.barbershop_id == barbershop_id,
            BarberAvailability.barber_id.in_(barber_ids),
            BarberAvailability.is_active.is_(True),
        )
        .first()
    )
    if has_availability is None:
        return False, INCOMPLETE_BOOKING_MESSAGE

    return True, None


def search_booking_ready_barbershops(
    db: Session,
    search: str = "",
    *,
    limit: int = 10,
) -> list[PublicBarbershopSearchResult]:
    """Lista barbearias aptas para agendamento público, com busca opcional por nome."""
    term = _normalize_search(search)
    results: list[PublicBarbershopSearchResult] = []

    query = (
        db.query(Barbershop)
        .filter(Barbershop.is_active.is_(True))
        .order_by(Barbershop.name.asc())
    )
    for barbershop in query.all():
        ready, _ = check_booking_readiness(db, barbershop.id)
        if not ready:
            continue
        if term and term not in _normalize_search(barbershop.name) and term not in _normalize_search(barbershop.slug):
            continue
        results.append(
            PublicBarbershopSearchResult(name=barbershop.name, slug=barbershop.slug),
        )
        if len(results) >= limit:
            break
    return results


def get_public_barbershop(db: Session, slug: str) -> PublicBarbershopResponse:
    """Retorna dados públicos da barbearia."""
    barbershop = get_barbershop_by_slug(db, slug)
    ready, message = check_booking_readiness(db, barbershop.id)
    return PublicBarbershopResponse(
        name=barbershop.name,
        slug=barbershop.slug,
        whatsapp=barbershop.whatsapp,
        booking_ready=ready,
        booking_message=message,
    )


def list_public_services(db: Session, slug: str) -> list[PublicServiceResponse]:
    """Lista serviços ativos publicamente."""
    barbershop = get_barbershop_by_slug(db, slug)
    ready, message = check_booking_readiness(db, barbershop.id)
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=message)

    services = (
        db.query(Service)
        .filter(Service.barbershop_id == barbershop.id, Service.is_active.is_(True))
        .order_by(Service.name.asc())
        .all()
    )
    return [
        PublicServiceResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            duration_minutes=s.duration_minutes,
            price=str(s.price),
        )
        for s in services
    ]


def list_public_barbers(db: Session, slug: str) -> list[PublicBarberResponse]:
    """Lista barbeiros ativos publicamente."""
    barbershop = get_barbershop_by_slug(db, slug)
    ready, message = check_booking_readiness(db, barbershop.id)
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=message)

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
    return [PublicBarberResponse(id=b.id, name=b.name) for b in barbers]
