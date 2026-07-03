"""Modelo Barbershop — unidade de negócio (tenant)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.client import Client
    from app.models.service import Service
    from app.models.user import User


class Barbershop(Base, TimestampMixin):
    """Barbearia cadastrada na plataforma."""

    __tablename__ = "barbershops"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    users: Mapped[list[User]] = relationship(
        "User",
        back_populates="barbershop",
        cascade="all, delete-orphan",
    )
    services: Mapped[list[Service]] = relationship(
        "Service",
        back_populates="barbershop",
        cascade="all, delete-orphan",
    )
    clients: Mapped[list[Client]] = relationship(
        "Client",
        back_populates="barbershop",
        cascade="all, delete-orphan",
    )
    appointments: Mapped[list[Appointment]] = relationship(
        "Appointment",
        back_populates="barbershop",
        cascade="all, delete-orphan",
    )
