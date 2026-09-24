"""add_eras_table

Revision ID: a382955debdd
Revises: 4a85ef9903d7
Create Date: 2026-09-24 14:43:43.008155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a382955debdd'
down_revision: Union[str, Sequence[str], None] = '4a85ef9903d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()
    if 'eras' not in tables:
        op.create_table(
            'eras',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('year', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('subtitle', sa.String(length=500), nullable=True),
            sa.Column('stats', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('year', name='uq_era_year')
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('eras')

