"""Serviços de negócio — clientes."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate


def normalize_phone(phone: str) -> str:
    """Remove espaços externos do telefone/WhatsApp."""
    return phone.strip()


def list_clients(
    db: Session,
    user: User,
    *,
    search: str | None = None,
    include_inactive: bool = False,
) -> list[ClientResponse]:
    """Lista clientes da barbearia do usuário autenticado."""
    query = db.query(Client).filter(Client.barbershop_id == user.barbershop_id)

    if not include_inactive:
        query = query.filter(Client.is_active.is_(True))

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(Client.full_name.ilike(term), Client.phone.ilike(term)),
        )

    clients = query.order_by(Client.full_name.asc()).all()
    return [ClientResponse.model_validate(c) for c in clients]


def get_client(db: Session, user: User, client_id: UUID) -> ClientResponse:
    """Obtém cliente por ID, com isolamento por barbearia."""
    client = _get_client_or_404(db, user, client_id)
    return ClientResponse.model_validate(client)


def create_client(db: Session, user: User, data: ClientCreate) -> ClientResponse:
    """Cria cliente na barbearia do usuário autenticado."""
    client = Client(
        barbershop_id=user.barbershop_id,
        full_name=data.full_name.strip(),
        phone=normalize_phone(data.phone),
        email=str(data.email) if data.email else None,
        notes=data.notes,
        is_active=True,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return ClientResponse.model_validate(client)


def update_client(
    db: Session,
    user: User,
    client_id: UUID,
    data: ClientUpdate,
) -> ClientResponse:
    """Atualiza cliente existente."""
    client = _get_client_or_404(db, user, client_id)

    updates = data.model_dump(exclude_unset=True)
    if "full_name" in updates and updates["full_name"] is not None:
        client.full_name = updates["full_name"].strip()
    if "phone" in updates and updates["phone"] is not None:
        client.phone = normalize_phone(updates["phone"])
    if "email" in updates:
        client.email = str(updates["email"]) if updates["email"] else None
    if "notes" in updates:
        client.notes = updates["notes"]
    if "is_active" in updates and updates["is_active"] is not None:
        client.is_active = updates["is_active"]

    db.commit()
    db.refresh(client)
    return ClientResponse.model_validate(client)


def deactivate_client(db: Session, user: User, client_id: UUID) -> ClientResponse:
    """Desativa cliente (soft delete)."""
    client = _get_client_or_404(db, user, client_id)
    client.is_active = False
    db.commit()
    db.refresh(client)
    return ClientResponse.model_validate(client)


def _get_client_or_404(db: Session, user: User, client_id: UUID) -> Client:
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.barbershop_id == user.barbershop_id)
        .first()
    )
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado.",
        )
    return client
