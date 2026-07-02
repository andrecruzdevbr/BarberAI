"""Serviços de negócio — resumo do dashboard."""

from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.enums import UserRole
from app.models.service import Service
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse


def get_dashboard_summary(db: Session, user: User) -> DashboardSummaryResponse:
    """Retorna totais reais da barbearia autenticada."""
    barbershop_id = user.barbershop_id

    active_clients = (
        db.query(Client)
        .filter(Client.barbershop_id == barbershop_id, Client.is_active.is_(True))
        .count()
    )
    active_services = (
        db.query(Service)
        .filter(Service.barbershop_id == barbershop_id, Service.is_active.is_(True))
        .count()
    )
    active_barbers = (
        db.query(User)
        .filter(
            User.barbershop_id == barbershop_id,
            User.role == UserRole.BARBER,
            User.is_active.is_(True),
        )
        .count()
    )
    active_receptionists = (
        db.query(User)
        .filter(
            User.barbershop_id == barbershop_id,
            User.role == UserRole.RECEPTIONIST,
            User.is_active.is_(True),
        )
        .count()
    )

    return DashboardSummaryResponse(
        active_clients=active_clients,
        active_services=active_services,
        active_barbers=active_barbers,
        active_receptionists=active_receptionists,
    )
