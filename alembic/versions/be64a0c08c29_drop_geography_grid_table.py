"""drop geography_grid table

Revision ID: be64a0c08c29
Revises: a382955debdd
Create Date: 2026-09-24 21:22:10.735883

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be64a0c08c29'
down_revision: Union[str, Sequence[str], None] = 'a382955debdd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: drop vestigial geography_grid table if it exists."""
    op.execute("DROP TABLE IF EXISTS geography_grid CASCADE;")


def downgrade() -> None:
    """Downgrade schema."""
    pass
