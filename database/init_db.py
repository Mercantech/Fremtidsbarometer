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


def ensure_database_schema(engine=None):
    """
    Guarantees that all required columns, types, and indexes exist across tables.
    Idempotent and concurrency-safe: inspects schema catalogs first so no ACCESS EXCLUSIVE
    locks are acquired when the schema is already up to date.
    """
    if engine is None:
        from database.session import engine as global_engine
        engine = global_engine

    from sqlalchemy import text, inspect
    import logging
    logger = logging.getLogger("DatabaseMigration")

    try:
        insp = inspect(engine)
        existing_tables = set(insp.get_table_names())

        needed_ddls = []

        if "ai_model_configs" in existing_tables:
            cols = {c["name"] for c in insp.get_columns("ai_model_configs")}
            if "api_key" not in cols:
                needed_ddls.append(("ALTER TABLE ai_model_configs ADD COLUMN api_key VARCHAR(500);", "ai_model_configs.api_key"))

        if "job_postings" in existing_tables:
            cols = {c["name"] for c in insp.get_columns("job_postings")}
            if "salary_min" not in cols:
                needed_ddls.append(("ALTER TABLE job_postings ADD COLUMN salary_min DOUBLE PRECISION;", "job_postings.salary_min"))
            if "salary_max" not in cols:
                needed_ddls.append(("ALTER TABLE job_postings ADD COLUMN salary_max DOUBLE PRECISION;", "job_postings.salary_max"))
            if "salary_currency" not in cols:
                needed_ddls.append(("ALTER TABLE job_postings ADD COLUMN salary_currency VARCHAR(10);", "job_postings.salary_currency"))

            indexes = {idx["name"] for idx in insp.get_indexes("job_postings")}
            if "idx_job_salary" not in indexes:
                needed_ddls.append(("CREATE INDEX idx_job_salary ON job_postings (salary_min, salary_max);", "job_postings.idx_job_salary"))

        if "pipeline_executions" in existing_tables:
            cols = {c["name"] for c in insp.get_columns("pipeline_executions")}
            if "force" not in cols:
                needed_ddls.append(("ALTER TABLE pipeline_executions ADD COLUMN force INTEGER DEFAULT 0;", "pipeline_executions.force"))

        if "data_sources" in existing_tables:
            cols = {c["name"] for c in insp.get_columns("data_sources")}
            if "source_type" not in cols:
                needed_ddls.append(("ALTER TABLE data_sources ADD COLUMN source_type VARCHAR(20) DEFAULT 'rss';", "data_sources.source_type"))
            if "country_code" not in cols:
                needed_ddls.append(("ALTER TABLE data_sources ADD COLUMN country_code VARCHAR(10) DEFAULT 'GLOBAL';", "data_sources.country_code"))

        if "system_settings" not in existing_tables:
            try:
                from database.models import SystemSetting
                SystemSetting.__table__.create(engine, checkfirst=True)
                logger.info("✅ Table system_settings created.")
            except Exception as tbl_err:
                logger.warning(f"Notice creating system_settings table: {tbl_err}")

        # Seed default globe_config if not present
        try:
            from database.models import SystemSetting
            from sqlalchemy.orm import Session
            with Session(engine) as s:
                cfg = s.query(SystemSetting).filter(SystemSetting.key == "globe_config").first()
                if not cfg:
                    s.add(SystemSetting(
                        key="globe_config",
                        value={
                            "batch_rotation_seconds": 15,
                            "max_visible_pins": 14,
                            "hype_ratio": 50,
                            "prioritize_salary": True,
                            "prioritize_trending_tech": True,
                            "pause_on_hover": True,
                        }
                    ))
                    s.commit()
                    logger.info("🌱 Default globe_config initialized in system_settings.")
        except Exception as seed_err:
            logger.info(f"Notice verifying globe_config seed: {seed_err}")

        if needed_ddls:
            for ddl_sql, desc in needed_ddls:
                try:
                    with engine.connect() as conn:
                        conn.execute(text(f"SET lock_timeout = '3s'; {ddl_sql}"))
                        conn.commit()
                        logger.info(f"✅ Schema column/index added: {desc}")
                except Exception as ddl_err:
                    logger.warning(f"⚠️ Non-fatal schema migration notice for [{desc}]: {ddl_err}")
        else:
            logger.info("✅ Database schema is up-to-date (no DDL locks required).")

        # Synchronize Alembic state without failing on pre-existing tables
        if "ats_companies" in existing_tables or "job_postings" in existing_tables:
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config("alembic.ini")
            is_stamped = False
            if "alembic_version" in existing_tables:
                try:
                    with engine.connect() as conn:
                        res = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchall()
                        if res:
                            is_stamped = True
                except Exception:
                    pass
            if not is_stamped:
                try:
                    command.stamp(alembic_cfg, "head")
                    logger.info("✅ Database stamped to Alembic head revision.")
                except Exception as stamp_err:
                    logger.info(f"ℹ️ Alembic stamp notice: {stamp_err}")
        else:
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config("alembic.ini")
            try:
                command.upgrade(alembic_cfg, "head")
                logger.info("✅ Alembic migration applied to head.")
            except Exception as mig_err:
                logger.info(f"ℹ️ Alembic upgrade notice: {mig_err}")
    except Exception as e:
        logger.warning(f"Schema verification notice: {e}")


def repair_data_sources(session):
    """
    Repairs legacy or misconfigured data sources idempotently:
    - Moves non-job dev.to feeds (e.g. watercooler) to category 'social'
    - Fixes Lobste.rs API URLs to valid .json endpoints and ensures correct source_type
    """
    from database.models import DataSource, SourceLog
    import logging
    logger = logging.getLogger("DataSourcesRepair")

    try:
        # 1. dev.to/watercooler -> social
        watercooler_sources = session.query(DataSource).filter(
            DataSource.url.ilike("%watercooler%")
        ).all()
        for src in watercooler_sources:
            if src.category != "social" or src.source_type != "rss":
                old_cat = src.category
                src.category = "social"
                src.source_type = "rss"
                logger.info(f"Repaired watercooler source #{src.id}: category {old_cat} -> social, source_type -> rss")

        # 2. Lobste.rs root URL as API -> hottest.json
        lobsters_sources = session.query(DataSource).filter(
            DataSource.name.ilike("%Lobste.rs%"),
        ).all()
        hottest_exists = session.query(DataSource).filter(
            DataSource.url == "https://lobste.rs/hottest.json"
        ).first()

        for src in lobsters_sources:
            if src.category == "jobs":
                src.category = "tech"
                logger.info(f"Repaired Lobste.rs source #{src.id}: category jobs -> tech")
            if src.url.rstrip("/") == "https://lobste.rs" and src.source_type == "api":
                if hottest_exists and hottest_exists.id != src.id:
                    src.is_active = 0
                    logger.info(f"Deactivated redundant legacy Lobste.rs source #{src.id} (hottest.json already active as #{hottest_exists.id})")
                else:
                    src.url = "https://lobste.rs/hottest.json"
                    logger.info(f"Repaired Lobste.rs API source #{src.id}: url updated to https://lobste.rs/hottest.json")
            elif ("rss" in src.url or src.url.endswith("/rss")) and src.source_type != "rss":
                src.source_type = "rss"
                logger.info(f"Repaired Lobste.rs RSS source #{src.id}: source_type -> rss")

        # 3. Clean up Reddit sources (Reddit blocks public API / zero scraping permitted)
        reddit_sources = session.query(DataSource).filter(
            (DataSource.name.ilike("%Reddit%")) | (DataSource.url.ilike("%reddit.com%"))
        ).all()
        if reddit_sources:
            reddit_ids = [s.id for s in reddit_sources]
            session.query(SourceLog).filter(SourceLog.data_source_id.in_(reddit_ids)).delete(synchronize_session=False)
            session.query(DataSource).filter(DataSource.id.in_(reddit_ids)).delete(synchronize_session=False)
            logger.info(f"Purged {len(reddit_sources)} deprecated Reddit data sources and related error logs.")

        session.commit()
    except Exception as e:
        session.rollback()
        logger.warning(f"Data source auto-repair notice: {e}")


def init_db():
    """Creates all tables in the database."""
    try:
        engine = get_engine()
        print(f"🔗 Connecting to DB: {engine.url.host}...")

        Base.metadata.create_all(engine)

        # Ensure schema migrations for existing tables
        ensure_database_schema(engine)

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
