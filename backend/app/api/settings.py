"""Rotas HTTP — configurações da barbearia."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_owner
from app.models.user import User
from app.schemas.settings import BarbershopSettingsResponse, BarbershopSettingsUpdate
from app.services import settings as settings_service

router = APIRouter()


@router.get("/barbershop", response_model=BarbershopSettingsResponse)
def get_barbershop_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BarbershopSettingsResponse:
    """Retorna configurações da barbearia autenticada."""
    return settings_service.get_barbershop_settings(db, current_user)


@router.put("/barbershop", response_model=BarbershopSettingsResponse)
def update_barbershop_settings(
    data: BarbershopSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
) -> BarbershopSettingsResponse:
    """Atualiza nome e WhatsApp da barbearia (somente owner)."""
    return settings_service.update_barbershop_settings(db, current_user, data)
