"""Modelo User — dono, barbeiro ou recepcionista."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UserRole
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.barbershop import Barbershop

user_role_enum = Enum(
    UserRole,
    name="user_role",
    native_enum=True,
    create_constraint=True,
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
)


class User(Base, TimestampMixin):
    """Usuário vinculado a uma barbearia."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    barbershop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("barbershops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(user_role_enum, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    barbershop: Mapped[Barbershop] = relationship(
        "Barbershop",
        back_populates="users",
    )
    appointments_as_barber: Mapped[list[Appointment]] = relationship(
        "Appointment",
        back_populates="barber",
        foreign_keys="Appointment.barber_id",
    )
