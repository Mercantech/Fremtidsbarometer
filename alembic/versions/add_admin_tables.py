"""Add admin tables: ai_model_configs, data_sources, source_logs

Revision ID: add_admin_tables
Revises: 93498c7c5cdc
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_admin_tables'
down_revision: Union[str, Sequence[str], None] = '93498c7c5cdc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add admin tables."""
    
    # Create AI Model Configs table
    op.create_table(
        'ai_model_configs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_type', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_fallback', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_type', 'model_name', 'provider', name='uq_ai_model_config')
    )
    op.create_index('idx_aimodel_task', 'ai_model_configs', ['task_type'], unique=False)
    op.create_index('idx_aimodel_active', 'ai_model_configs', ['is_active'], unique=False)

    # Create Data Sources table
    op.create_table(
        'data_sources',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('url', sa.String(length=1000), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'source_type', name='uq_data_source')
    )
    op.create_index('idx_datasource_category', 'data_sources', ['category'], unique=False)
    op.create_index('idx_datasource_active', 'data_sources', ['is_active'], unique=False)

    # Create Source Logs table
    op.create_table(
        'source_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('data_source_id', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=False),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_sourcelog_created', 'source_logs', ['created_at'], unique=False)
    op.create_index('idx_sourcelog_source', 'source_logs', ['data_source_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove admin tables."""
    op.drop_index('idx_sourcelog_source', table_name='source_logs')
    op.drop_index('idx_sourcelog_created', table_name='source_logs')
    op.drop_table('source_logs')

    op.drop_index('idx_datasource_active', table_name='data_sources')
    op.drop_index('idx_datasource_category', table_name='data_sources')
    op.drop_table('data_sources')

    op.drop_index('idx_aimodel_active', table_name='ai_model_configs')
    op.drop_index('idx_aimodel_task', table_name='ai_model_configs')
    op.drop_table('ai_model_configs')
