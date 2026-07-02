"""Modelo BarberAvailability — disponibilidade semanal do barbeiro."""

from __future__ import annotations

import uuid
from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.barbershop import Barbershop
    from app.models.user import User


class BarberAvailability(Base, TimestampMixin):
    """Intervalo de disponibilidade de um barbeiro em um dia da semana."""

    __tablename__ = "barber_availabilities"
    __table_args__ = (
        Index("ix_barber_availabilities_barber_id", "barber_id"),
        Index("ix_barber_availabilities_barber_id_weekday", "barber_id", "weekday"),
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
    barber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    barbershop: Mapped[Barbershop] = relationship("Barbershop")
    barber: Mapped[User] = relationship("User", foreign_keys=[barber_id])
