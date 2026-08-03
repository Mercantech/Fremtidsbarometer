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

        # Show created tables
        table_names = list(Base.metadata.tables.keys())
        print(f"✅ Created {len(table_names)} tables:")
        for name in sorted(table_names):
            print(f"   📋 {name}")

        print("\n🎉 Database initialized successfully!")

    except Exception as e:
        print(f"❌ DB initialization error: {e}")
        print("\nCheck the following:")
        print("  1. DATABASE_URL is set in .env")
        print("  2. Neon project is created at https://neon.tech")
        print("  3. Format: postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require")
        sys.exit(1)


if __name__ == "__main__":
    init_db()
