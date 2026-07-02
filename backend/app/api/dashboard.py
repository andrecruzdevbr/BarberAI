"""Rotas HTTP — resumo do dashboard."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services import dashboard as dashboard_service

router = APIRouter()


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardSummaryResponse:
    """Totais reais da barbearia autenticada."""
    return dashboard_service.get_dashboard_summary(db, current_user)
