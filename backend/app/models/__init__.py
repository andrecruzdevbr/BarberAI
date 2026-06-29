"""Modelos SQLAlchemy — importar todos para Alembic e metadata."""

from app.models.appointment import Appointment
from app.models.barbershop import Barbershop
from app.models.client import Client
from app.models.enums import AppointmentStatus, UserRole
from app.models.service import Service
from app.models.user import User

__all__ = [
    "Appointment",
    "AppointmentStatus",
    "Barbershop",
    "Client",
    "Service",
    "User",
    "UserRole",
]
