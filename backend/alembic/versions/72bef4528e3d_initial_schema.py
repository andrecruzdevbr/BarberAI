"""initial_schema

Revision ID: 72bef4528e3d
Revises:
Create Date: 2026-06-29 18:28:34.374367

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "72bef4528e3d"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_enum = postgresql.ENUM(
    "owner",
    "barber",
    "receptionist",
    name="user_role",
    create_type=False,
)

appointment_status_enum = postgresql.ENUM(
    "scheduled",
    "completed",
    "cancelled",
    "no_show",
    name="appointment_status",
    create_type=False,
)


def upgrade() -> None:
    """Cria enums, tabelas, FKs, índices e constraints de unicidade."""
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    appointment_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "barbershops",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("barbershop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["barbershop_id"], ["barbershops.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_barbershop_id", "users", ["barbershop_id"], unique=False)

    op.create_table(
        "services",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("barbershop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["barbershop_id"], ["barbershops.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("barbershop_id", "name", name="uq_services_barbershop_id_name"),
    )
    op.create_index("ix_services_barbershop_id", "services", ["barbershop_id"], unique=False)

    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("barbershop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.String(length=2000), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["barbershop_id"], ["barbershops.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clients_barbershop_id", "clients", ["barbershop_id"], unique=False)
    op.create_index(
        "ix_clients_barbershop_id_phone",
        "clients",
        ["barbershop_id", "phone"],
        unique=False,
    )

    op.create_table(
        "appointments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("barbershop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("barber_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            appointment_status_enum,
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("notes", sa.String(length=2000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["barbershop_id"], ["barbershops.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["barber_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_appointments_barbershop_id_starts_at",
        "appointments",
        ["barbershop_id", "starts_at"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_barber_id_starts_at",
        "appointments",
        ["barber_id", "starts_at"],
        unique=False,
    )
    op.create_index(
        "ix_appointments_client_id_starts_at",
        "appointments",
        ["client_id", "starts_at"],
        unique=False,
    )


def downgrade() -> None:
    """Remove tabelas e enums na ordem inversa."""
    op.drop_index("ix_appointments_client_id_starts_at", table_name="appointments")
    op.drop_index("ix_appointments_barber_id_starts_at", table_name="appointments")
    op.drop_index("ix_appointments_barbershop_id_starts_at", table_name="appointments")
    op.drop_table("appointments")

    op.drop_index("ix_clients_barbershop_id_phone", table_name="clients")
    op.drop_index("ix_clients_barbershop_id", table_name="clients")
    op.drop_table("clients")

    op.drop_index("ix_services_barbershop_id", table_name="services")
    op.drop_table("services")

    op.drop_index("ix_users_barbershop_id", table_name="users")
    op.drop_table("users")

    op.drop_table("barbershops")

    bind = op.get_bind()
    appointment_status_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
