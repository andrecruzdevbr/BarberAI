"""Rotas HTTP — serviços da barbearia."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_owner
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate
from app.services import service as service_service

router = APIRouter()


@router.get("", response_model=list[ServiceResponse])
def list_services(
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ServiceResponse]:
    """Lista serviços da barbearia autenticada."""
    return service_service.list_services(
        db,
        current_user,
        include_inactive=include_inactive,
    )


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    data: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> ServiceResponse:
    """Cria serviço (somente owner)."""
    return service_service.create_service(db, current_user, data)


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(
    service_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ServiceResponse:
    """Obtém serviço por ID."""
    return service_service.get_service(db, current_user, service_id)


@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: UUID,
    data: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> ServiceResponse:
    """Atualiza serviço (somente owner)."""
    return service_service.update_service(db, current_user, service_id, data)


@router.delete("/{service_id}", response_model=ServiceResponse)
def deactivate_service(
    service_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> ServiceResponse:
    """Desativa serviço (somente owner)."""
    return service_service.deactivate_service(db, current_user, service_id)
