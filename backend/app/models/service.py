"""Modelo Service — serviço oferecido pela barbearia."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.barbershop import Barbershop


class Service(Base, TimestampMixin):
    """Serviço cadastrado em uma barbearia."""

    __tablename__ = "services"
    __table_args__ = (
        UniqueConstraint("barbershop_id", "name", name="uq_services_barbershop_id_name"),
        Index("ix_services_barbershop_id", "barbershop_id"),
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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    barbershop: Mapped[Barbershop] = relationship(
        "Barbershop",
        back_populates="services",
    )
    appointments: Mapped[list[Appointment]] = relationship(
        "Appointment",
        back_populates="service",
    )
