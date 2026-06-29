"""Modelo Appointment — agendamento de atendimento."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import AppointmentStatus
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.barbershop import Barbershop
    from app.models.client import Client
    from app.models.service import Service
    from app.models.user import User

appointment_status_enum = Enum(
    AppointmentStatus,
    name="appointment_status",
    native_enum=True,
    create_constraint=True,
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
)


class Appointment(Base, TimestampMixin):
    """Agendamento entre cliente, barbeiro e serviço."""

    __tablename__ = "appointments"
    __table_args__ = (
        Index("ix_appointments_barbershop_id_starts_at", "barbershop_id", "starts_at"),
        Index("ix_appointments_barber_id_starts_at", "barber_id", "starts_at"),
        Index("ix_appointments_client_id_starts_at", "client_id", "starts_at"),
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
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    barber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=False,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        appointment_status_enum,
        nullable=False,
        default=AppointmentStatus.SCHEDULED,
    )
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    barbershop: Mapped[Barbershop] = relationship(
        "Barbershop",
        back_populates="appointments",
    )
    client: Mapped[Client] = relationship(
        "Client",
        back_populates="appointments",
    )
    barber: Mapped[User] = relationship(
        "User",
        back_populates="appointments_as_barber",
        foreign_keys=[barber_id],
    )
    service: Mapped[Service] = relationship(
        "Service",
        back_populates="appointments",
    )
