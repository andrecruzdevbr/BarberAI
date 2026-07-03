"""appointment_confirmation_message

Revision ID: c9f2e8b41a07
Revises: b7e4d1a92f63
Create Date: 2026-07-02 22:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c9f2e8b41a07"
down_revision: Union[str, Sequence[str], None] = "b7e4d1a92f63"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adiciona texto de confirmação preparado ao agendamento."""
    op.add_column(
        "appointments",
        sa.Column("confirmation_message", sa.String(length=2000), nullable=True),
    )


def downgrade() -> None:
    """Remove coluna confirmation_message."""
    op.drop_column("appointments", "confirmation_message")
