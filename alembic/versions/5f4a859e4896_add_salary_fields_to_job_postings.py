"""add_salary_fields_to_job_postings

Revision ID: 5f4a859e4896
Revises: 7b5d1a8c3e2f
Create Date: 2026-10-09 09:27:24.195166

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f4a859e4896'
down_revision: Union[str, Sequence[str], None] = '7b5d1a8c3e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add salary_min, salary_max, salary_currency to job_postings."""
    op.execute("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_min DOUBLE PRECISION;")
    op.execute("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_max DOUBLE PRECISION;")
    op.execute("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_job_salary ON job_postings(salary_min, salary_max);")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS idx_job_salary;")
    op.execute("ALTER TABLE job_postings DROP COLUMN IF EXISTS salary_currency;")
    op.execute("ALTER TABLE job_postings DROP COLUMN IF EXISTS salary_max;")
    op.execute("ALTER TABLE job_postings DROP COLUMN IF EXISTS salary_min;")
