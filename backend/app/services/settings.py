"""Serviço de configurações da barbearia."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.barbershop import Barbershop
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.settings import BarbershopSettingsResponse, BarbershopSettingsUpdate


def get_barbershop_settings(db: Session, user: User) -> BarbershopSettingsResponse:
    """Retorna configurações da barbearia do usuário autenticado."""
    barbershop = _get_barbershop_or_404(db, user)
    return BarbershopSettingsResponse.model_validate(barbershop)


def update_barbershop_settings(
    db: Session,
    user: User,
    data: BarbershopSettingsUpdate,
) -> BarbershopSettingsResponse:
    """Atualiza nome e WhatsApp da barbearia (somente owner)."""
    if user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente.",
        )

    barbershop = _get_barbershop_or_404(db, user)
    updates = data.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is not None:
        barbershop.name = updates["name"]
    if "whatsapp" in updates:
        barbershop.whatsapp = updates["whatsapp"]

    db.commit()
    db.refresh(barbershop)
    return BarbershopSettingsResponse.model_validate(barbershop)


def _get_barbershop_or_404(db: Session, user: User) -> Barbershop:
    barbershop = (
        db.query(Barbershop)
        .filter(Barbershop.id == user.barbershop_id)
        .first()
    )
    if barbershop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barbearia não encontrada.",
        )
    return barbershop
