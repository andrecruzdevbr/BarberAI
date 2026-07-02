"""barber_availability

Revision ID: a3f8c2d91e04
Revises: 72bef4528e3d
Create Date: 2026-06-29 22:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a3f8c2d91e04"
down_revision: Union[str, Sequence[str], None] = "72bef4528e3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Cria tabela barber_availabilities com índices."""
    op.create_table(
        "barber_availabilities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("barbershop_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("barber_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
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
        sa.ForeignKeyConstraint(["barber_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_barber_availabilities_barber_id",
        "barber_availabilities",
        ["barber_id"],
    )
    op.create_index(
        "ix_barber_availabilities_barber_id_weekday",
        "barber_availabilities",
        ["barber_id", "weekday"],
    )


def downgrade() -> None:
    """Remove tabela barber_availabilities."""
    op.drop_index(
        "ix_barber_availabilities_barber_id_weekday",
        table_name="barber_availabilities",
    )
    op.drop_index(
        "ix_barber_availabilities_barber_id",
        table_name="barber_availabilities",
    )
    op.drop_table("barber_availabilities")
