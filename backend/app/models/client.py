"""Modelo Client — cliente da barbearia."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.barbershop import Barbershop


class Client(Base, TimestampMixin):
    """Cliente vinculado a uma barbearia."""

    __tablename__ = "clients"
    __table_args__ = (
        Index("ix_clients_barbershop_id", "barbershop_id"),
        Index("ix_clients_barbershop_id_phone", "barbershop_id", "phone"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    barbershop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("barbershops.id", ondelete="CASCADE"),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    barbershop: Mapped[Barbershop] = relationship(
        "Barbershop",
        back_populates="clients",
    )
    appointments: Mapped[list[Appointment]] = relationship(
        "Appointment",
        back_populates="client",
    )
