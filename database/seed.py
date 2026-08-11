"""
Fremtidsbarometer — Seed Data Generator
Loads historical data (1960 - 2024) into the tech_trends table.
Uses on_conflict_do_nothing for safe multiple executions.
"""

import sys
import os
from datetime import datetime, timezone
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from database.models import TechTrend, Era
from database.session import get_session
from sqlalchemy.dialects.postgresql import insert


# Eras seed data
ERAS_SEED = [
    {
        "year": 1995,
        "title": "Web 1.0 Dawn",
        "subtitle": "Commercial web boom & basic CGI scripts",
        "stats": {
            "roles": [["Webmaster", "HIGH"], ["Sysadmin", "$50k/YR"], ["C++ Dev", "CORE"]],
            "stack": [["HTML/CGI", "NEW"], ["Perl", "BACKEND"], ["C/C++", "SYSTEM"]],
            "hypeTopic": "Dot-Com Boom",
            "hypeDesc": "Creation of the first commercial websites. The internet becomes accessible to the masses. Everyone wants their own website."
        }
    },
    {
        "year": 2008,
        "title": "Mobile & Cloud Era",
        "subtitle": "App Store launch & AWS Cloud standardization",
        "stats": {
            "roles": [["iOS/Android Dev", "HOT"], ["Fullstack", "$90k/YR"], ["Scrum Master", "TREND"]],
            "stack": [["Objective-C", "MOBILE"], ["Java", "ENTERPRISE"], ["Ruby on Rails", "STARTUPS"]],
            "hypeTopic": "App Economy",
            "hypeDesc": "Mobile applications change the market. The launch of AWS makes cloud infrastructure the standard."
        }
    },
    {
        "year": 2018,
        "title": "Cloud Native & Crypto",
        "subtitle": "Kubernetes orchestration & Microservices",
        "stats": {
            "roles": [["DevOps/SRE", "CRITICAL"], ["Data Scientist", "SEXY"], ["Web3 Dev", "NICHE"]],
            "stack": [["Go/Docker", "INFRA"], ["Python", "DATA"], ["React/Vue", "FRONTEND"]],
            "hypeTopic": "Blockchain & Microservices",
            "hypeDesc": "Decentralization, smart contracts, and the enterprise transition to microservice architecture."
        }
    },
    {
        "year": 2026,
        "title": "AI Agents Era",
        "subtitle": "Autonomous LLMs, System Logic & Agentic Workflows",
        "stats": {
            "roles": [["Backend (Go/C#)", "HIGH DEMAND"], ["AI Integrator", "$130k/YR"], ["DevOps Arch.", "CORE"]],
            "stack": [["Python", "AI CORE"], ["Go", "MICROSERVICES"], ["TypeScript", "WEB STD"]],
            "hypeTopic": "AI Agents: System Logic",
            "hypeDesc": "Autonomous architecture design. The transition from simple code string generation to systemic refactoring."
        }
    }
]


# Base historical data for simulation (if no real CSV exists)
# Format: "Language": { "start_year": int, "peak_year": int, "current_trend": float }
LANGUAGES_HISTORY = {
    "COBOL": {"start": 1960, "peak": 1975, "current": 2},
    "Fortran": {"start": 1960, "peak": 1980, "current": 3},
    "C": {"start": 1972, "peak": 1995, "current": 40},
    "C++": {"start": 1985, "peak": 2005, "current": 60},
    "Python": {"start": 1991, "peak": 2025, "current": 100},
    "Java": {"start": 1995, "peak": 2012, "current": 80},
    "JavaScript": {"start": 1995, "peak": 2022, "current": 95},
    "C#": {"start": 2000, "peak": 2018, "current": 70},
    "Go": {"start": 2009, "peak": 2025, "current": 65},
    "Rust": {"start": 2010, "peak": 2026, "current": 75},
    "TypeScript": {"start": 2012, "peak": 2025, "current": 85},
}


def calculate_popularity(lang, year):
    """Simple heuristic for generating historical popularity curves."""
    data = LANGUAGES_HISTORY[lang]
    if year < data["start"]:
        return 0.0
    
    # Growth until peak
    if year <= data["peak"]:
        progress = (year - data["start"]) / max(1, (data["peak"] - data["start"]))
        # Exponential or linear growth
        return min(100.0, progress * 100)
    
    # Decline or stabilization after peak
    years_past_peak = year - data["peak"]
    decay_factor = max(0.2, 1.0 - (years_past_peak * 0.02)) # Slow decline
    
    # Adjust to converge to the "current" value in 2024
    target = data["current"]
    
    return min(100.0, max(1.0, 100.0 * decay_factor * (target / 100.0)))


def seed_historical_data():
    session = get_session()
    print("🌱 Starting generation of historical data (1960 - 2024)...")
    
    records_to_insert = []
    
    for year in range(1960, 2025):
        date_obj = datetime(year, 1, 1, tzinfo=timezone.utc)
        
        for lang in LANGUAGES_HISTORY.keys():
            popularity = calculate_popularity(lang, year)
            if popularity > 0:
                # Add some noise
                noise = random.uniform(-2.0, 2.0)
                final_popularity = max(0.5, min(100.0, popularity + noise))
                
                records_to_insert.append({
                    "technology": lang,
                    "country": "GLOBAL",
                    "source": "historical_seed",
                    "date": date_obj,
                    "popularity": round(final_popularity, 1),
                    "mentions": int(final_popularity * 100)
                })

    print(f"📊 Generated {len(records_to_insert)} records. Loading into DB...")
    
    # Use PostgreSQL ON CONFLICT DO NOTHING
    try:
        stmt = insert(TechTrend).values(records_to_insert)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["technology", "country", "source", "date"]
        )
        result = session.execute(stmt)
        session.commit()
        
        inserted = result.rowcount if hasattr(result, 'rowcount') else "unknown"
        print(f"✅ Success! Added new records: {inserted} (duplicates ignored).")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error loading data: {e}")
        print("Did you forget to run python database/init_db.py ?")
    finally:
        session.close()


def seed_eras():
    """Seeds the eras table with historical IT era definitions."""
    session = get_session()
    print("🕐 Seeding historical IT eras...")

    try:
        for era_data in ERAS_SEED:
            stmt = insert(Era).values(**era_data)
            stmt = stmt.on_conflict_do_nothing(index_elements=["year"])
            session.execute(stmt)
        session.commit()
        print(f"✅ Seeded {len(ERAS_SEED)} eras (duplicates ignored).")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding eras: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    seed_historical_data()
    seed_eras()
