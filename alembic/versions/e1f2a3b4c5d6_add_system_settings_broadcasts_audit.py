"""add system_settings, broadcast_pins, admin_audit_logs

Revision ID: e1f2a3b4c5d6
Revises: 5f4a859e4896
Create Date: 2026-10-10 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = '5f4a859e4896'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    # 1. system_settings
    if 'system_settings' not in existing_tables:
        op.create_table(
            'system_settings',
            sa.Column('key', sa.String(length=100), primary_key=True, nullable=False),
            sa.Column('value', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        )

    # 2. broadcast_pins
    if 'broadcast_pins' not in existing_tables:
        op.create_table(
            'broadcast_pins',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('title', sa.String(length=300), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=True, server_default='education'),
            sa.Column('institution', sa.String(length=200), nullable=True, server_default='Mercantec'),
            sa.Column('location_name', sa.String(length=100), nullable=True, server_default='Viborg, Denmark'),
            sa.Column('latitude', sa.Float(), nullable=False),
            sa.Column('longitude', sa.Float(), nullable=False),
            sa.Column('url', sa.String(length=500), nullable=True),
            sa.Column('justification', sa.Text(), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_broadcast_pins_is_active', 'broadcast_pins', ['is_active'])

    # 3. admin_audit_logs
    if 'admin_audit_logs' not in existing_tables:
        op.create_table(
            'admin_audit_logs',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('entity_type', sa.String(length=50), nullable=True),
            sa.Column('entity_id', sa.String(length=100), nullable=True),
            sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('ip_address', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_admin_audit_logs_action', 'admin_audit_logs', ['action'])
        op.create_index('ix_admin_audit_logs_created_at', 'admin_audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_table('admin_audit_logs')
    op.drop_table('broadcast_pins')
    op.drop_table('system_settings')
