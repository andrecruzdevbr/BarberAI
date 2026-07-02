"""add_whatsapp_fields

Revision ID: b7e4d1a92f63
Revises: a3f8c2d91e04
Create Date: 2026-07-02 01:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7e4d1a92f63"
down_revision: Union[str, Sequence[str], None] = "a3f8c2d91e04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adiciona colunas whatsapp em users e barbershops."""
    op.add_column("users", sa.Column("whatsapp", sa.String(length=20), nullable=True))
    op.create_index("ix_users_whatsapp", "users", ["whatsapp"], unique=False)

    op.add_column("barbershops", sa.Column("whatsapp", sa.String(length=20), nullable=True))
    op.create_index("ix_barbershops_whatsapp", "barbershops", ["whatsapp"], unique=False)


def downgrade() -> None:
    """Remove colunas whatsapp."""
    op.drop_index("ix_barbershops_whatsapp", table_name="barbershops")
    op.drop_column("barbershops", "whatsapp")
    op.drop_index("ix_users_whatsapp", table_name="users")
    op.drop_column("users", "whatsapp")
