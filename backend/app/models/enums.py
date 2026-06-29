"""Enums de domínio mapeados para tipos PostgreSQL nomeados."""

import enum


class UserRole(str, enum.Enum):
    """Papel do usuário dentro da barbearia."""

    OWNER = "owner"
    BARBER = "barber"
    RECEPTIONIST = "receptionist"


class AppointmentStatus(str, enum.Enum):
    """Status de um agendamento."""

    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
