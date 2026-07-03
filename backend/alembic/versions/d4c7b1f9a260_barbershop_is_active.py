"""barbershop_is_active

Revision ID: d4c7b1f9a260
Revises: c9f2e8b41a07
Create Date: 2026-07-03 13:40:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4c7b1f9a260"
down_revision: Union[str, Sequence[str], None] = "c9f2e8b41a07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adiciona flag is_active à barbearia (padrão ativo)."""
    op.add_column(
        "barbershops",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.create_index("ix_barbershops_is_active", "barbershops", ["is_active"], unique=False)


def downgrade() -> None:
    """Remove flag is_active da barbearia."""
    op.drop_index("ix_barbershops_is_active", table_name="barbershops")
    op.drop_column("barbershops", "is_active")
