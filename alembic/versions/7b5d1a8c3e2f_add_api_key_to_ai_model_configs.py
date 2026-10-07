"""add api_key to ai_model_configs

Revision ID: 7b5d1a8c3e2f
Revises: be64a0c08c29
Create Date: 2026-10-07 11:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b5d1a8c3e2f'
down_revision: Union[str, Sequence[str], None] = 'be64a0c08c29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: ensure api_key column exists in ai_model_configs."""
    op.execute("ALTER TABLE ai_model_configs ADD COLUMN IF NOT EXISTS api_key VARCHAR(500);")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE ai_model_configs DROP COLUMN IF EXISTS api_key;")
