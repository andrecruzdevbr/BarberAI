"""Serviços de negócio — serviços da barbearia."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.service import Service
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate


def list_services(
    db: Session,
    user: User,
    *,
    include_inactive: bool = False,
) -> list[ServiceResponse]:
    """Lista serviços da barbearia do usuário autenticado."""
    query = db.query(Service).filter(Service.barbershop_id == user.barbershop_id)

    if not include_inactive:
        query = query.filter(Service.is_active.is_(True))

    services = query.order_by(Service.name.asc()).all()
    return [ServiceResponse.model_validate(s) for s in services]


def get_service(db: Session, user: User, service_id: UUID) -> ServiceResponse:
    """Obtém serviço por ID, com isolamento por barbearia."""
    service = _get_service_or_404(db, user, service_id)
    return ServiceResponse.model_validate(service)


def create_service(db: Session, user: User, data: ServiceCreate) -> ServiceResponse:
    """Cria serviço na barbearia do usuário autenticado."""
    _ensure_unique_active_name(db, user.barbershop_id, data.name.strip())

    service = Service(
        barbershop_id=user.barbershop_id,
        name=data.name.strip(),
        description=data.description,
        duration_minutes=data.duration_minutes,
        price=data.price,
        is_active=True,
    )

    try:
        db.add(service)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um serviço com este nome nesta barbearia.",
        ) from None

    db.refresh(service)
    return ServiceResponse.model_validate(service)


def update_service(
    db: Session,
    user: User,
    service_id: UUID,
    data: ServiceUpdate,
) -> ServiceResponse:
    """Atualiza serviço existente."""
    service = _get_service_or_404(db, user, service_id)
    updates = data.model_dump(exclude_unset=True)

    new_name = updates.get("name", service.name)
    if isinstance(new_name, str):
        new_name = new_name.strip()

    will_be_active = updates.get("is_active", service.is_active)
    if will_be_active:
        _ensure_unique_active_name(
            db,
            user.barbershop_id,
            new_name,
            exclude_id=service.id,
        )

    if "name" in updates and updates["name"] is not None:
        service.name = new_name
    if "description" in updates:
        service.description = updates["description"]
    if "duration_minutes" in updates and updates["duration_minutes"] is not None:
        service.duration_minutes = updates["duration_minutes"]
    if "price" in updates and updates["price"] is not None:
        service.price = updates["price"]
    if "is_active" in updates and updates["is_active"] is not None:
        service.is_active = updates["is_active"]

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um serviço ativo com este nome nesta barbearia.",
        ) from None

    db.refresh(service)
    return ServiceResponse.model_validate(service)


def deactivate_service(db: Session, user: User, service_id: UUID) -> ServiceResponse:
    """Desativa serviço (soft delete)."""
    service = _get_service_or_404(db, user, service_id)
    service.is_active = False
    db.commit()
    db.refresh(service)
    return ServiceResponse.model_validate(service)


def _get_service_or_404(db: Session, user: User, service_id: UUID) -> Service:
    service = (
        db.query(Service)
        .filter(Service.id == service_id, Service.barbershop_id == user.barbershop_id)
        .first()
    )
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Serviço não encontrado.",
        )
    return service


def _ensure_unique_active_name(
    db: Session,
    barbershop_id: UUID,
    name: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    """Garante que não exista outro serviço ativo com o mesmo nome."""
    query = db.query(Service.id).filter(
        Service.barbershop_id == barbershop_id,
        Service.is_active.is_(True),
        func.lower(Service.name) == name.lower(),
    )
    if exclude_id is not None:
        query = query.filter(Service.id != exclude_id)

    if query.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um serviço ativo com este nome nesta barbearia.",
        )
