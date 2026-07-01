"""Rotas HTTP — clientes."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_owner_or_receptionist
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.services import client as client_service

router = APIRouter()


@router.get("", response_model=list[ClientResponse])
def list_clients(
    search: str | None = Query(default=None, max_length=255),
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner_or_receptionist),
) -> list[ClientResponse]:
    """Lista clientes da barbearia autenticada."""
    return client_service.list_clients(
        db,
        current_user,
        search=search,
        include_inactive=include_inactive,
    )


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner_or_receptionist),
) -> ClientResponse:
    """Cria cliente na barbearia autenticada."""
    return client_service.create_client(db, current_user, data)


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner_or_receptionist),
) -> ClientResponse:
    """Obtém cliente por ID."""
    return client_service.get_client(db, current_user, client_id)


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: UUID,
    data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner_or_receptionist),
) -> ClientResponse:
    """Atualiza cliente existente."""
    return client_service.update_client(db, current_user, client_id, data)


@router.delete("/{client_id}", response_model=ClientResponse)
def deactivate_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner_or_receptionist),
) -> ClientResponse:
    """Desativa cliente (soft delete)."""
    return client_service.deactivate_client(db, current_user, client_id)
