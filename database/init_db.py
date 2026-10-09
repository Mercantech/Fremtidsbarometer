"""
Fremtidsbarometer — Database Initialization.
Creates all tables defined in models.py.

Usage:
    python database/init_db.py

Supports:
    - Neon (free serverless PostgreSQL) — for tests and MVP
    - Local Docker PostgreSQL — for production
"""

import sys
import os

# Add project root to PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from database.models import Base, get_engine


def init_db():
    """Creates all tables in the database."""
    try:
        engine = get_engine()
        print(f"🔗 Connecting to DB: {engine.url.host}...")

        Base.metadata.create_all(engine)

        # Ensure schema migrations for existing tables
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE ai_model_configs ADD COLUMN IF NOT EXISTS api_key VARCHAR(500);"))
            conn.execute(text("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_min DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_max DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_job_salary ON job_postings (salary_min, salary_max);"))
            conn.commit()
            print("   🔧 Schema columns verified (api_key in ai_model_configs, salary_min/max/currency in job_postings).")

        # Automatically apply Alembic migrations to head
        try:
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config("alembic.ini")
            command.upgrade(alembic_cfg, "head")
            print("   🔧 Alembic migration applied to head.")
        except Exception as mig_err:
            print(f"   ℹ️ Alembic upgrade notice: {mig_err}")

        # Show created tables
        table_names = list(Base.metadata.tables.keys())
        print(f"✅ Created/Verified {len(table_names)} tables:")
        for name in sorted(table_names):
            print(f"   📋 {name}")

        # Ensure initial seed data is populated (eras, AI models, sources, trends)
        from database.session import get_session
        from database.seeds.eras import seed_eras
        from database.seeds.history import seed_historical_data
        from database.seeds.sources import seed_sources
        from database.seeds.ai_models import seed_ai_models
        from database.seeds.salaries import seed_salary_data

        session = get_session()
        try:
            print("\n🌱 Checking and populating seed data...")
            seed_eras(session)
            seed_historical_data(session)
            seed_sources(session)
            seed_ai_models(session)
            seed_salary_data(session)
            print("✅ All seed data verified and ready.")
        finally:
            session.close()

        print("\n🎉 Database initialized and seeded successfully!")

    except Exception as e:
        print(f"❌ DB initialization error: {e}")
        print("\nCheck the following:")
        print("  1. DATABASE_URL is set in .env")
        print("  2. Neon project is created at https://neon.tech")
        print("  3. Format: postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require")
        sys.exit(1)


if __name__ == "__main__":
    init_db()
