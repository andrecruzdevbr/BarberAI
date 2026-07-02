"""Schemas Pydantic — resumo do dashboard."""

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    """Totais reais da barbearia autenticada."""

    active_clients: int
    active_services: int
    active_barbers: int
    active_receptionists: int
