"""
Fremtidsbarometer — Modular Database Seed Runner.
Executes modular seed scripts for eras, history (1960-2034), geography,
sources, AI models, and salary benchmarks.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from database.session import get_session
from database.seeds import (
    seed_historical_data,
    seed_eras,
    seed_sources,
    seed_ai_models,
    seed_salary_data,
)

def run_all_seeds():
    """Executes all database seed routines inside a single managed session."""
    session = get_session()
    print("🚀 Starting database seed routines...")
    try:
        seed_historical_data(session)
        seed_eras(session)
        seed_sources(session)
        seed_ai_models(session)
        seed_salary_data(session)
        print("🎉 All database seeds executed successfully!")
    finally:
        session.close()

if __name__ == "__main__":
    run_all_seeds()
