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

from database.models import TechTrend, Era, GeographyGrid, DataSource
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


def seed_geography():
    session = get_session()
    print("🌍 Seeding Geography Grid (Tier-1 and Tier-2)...")
    
    geo_seed = [
        # Tier 1 (Deep Analysis)
        {"country_code": "US", "region_name": "Silicon Valley", "tier": 1, "lat": 37.38, "lng": -122.08},
        {"country_code": "DK", "region_name": "Denmark", "tier": 1, "lat": 55.67, "lng": 12.56},
        {"country_code": "NO", "region_name": "Norway", "tier": 1, "lat": 59.91, "lng": 10.75},
        {"country_code": "SE", "region_name": "Sweden", "tier": 1, "lat": 59.32, "lng": 18.06},
        {"country_code": "DE", "region_name": "Germany", "tier": 1, "lat": 52.52, "lng": 13.40},
        {"country_code": "PL", "region_name": "Poland", "tier": 1, "lat": 52.22, "lng": 21.01},
        {"country_code": "BE", "region_name": "Belgium", "tier": 1, "lat": 50.85, "lng": 4.35},
        {"country_code": "NL", "region_name": "Netherlands", "tier": 1, "lat": 52.36, "lng": 4.90},
        
        # Tier 2 (Batched by Continent)
        {"country_code": "BR", "region_name": "South America (Brazil)", "tier": 2, "lat": -23.55, "lng": -46.63},
        {"country_code": "JP", "region_name": "Asia (Japan)", "tier": 2, "lat": 35.67, "lng": 139.65},
        {"country_code": "ZA", "region_name": "Africa (South Africa)", "tier": 2, "lat": -33.92, "lng": 18.42},
        {"country_code": "AU", "region_name": "Oceania (Australia)", "tier": 2, "lat": -33.86, "lng": 151.20},
        {"country_code": "GB", "region_name": "Rest of Europe (UK)", "tier": 2, "lat": 51.50, "lng": -0.12},
    ]

    try:
        for geo_data in geo_seed:
            stmt = insert(GeographyGrid).values(**geo_data)
            stmt = stmt.on_conflict_do_nothing(index_elements=["country_code", "region_name"])
            session.execute(stmt)
        session.commit()
        print(f"✅ Seeded Geography Grid.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding Geography Grid: {e}")
    finally:
        session.close()


def seed_sources():
    session = get_session()
    print("📡 Seeding Data Sources...")
    
    sources_seed = [
        {"name": "TeamTailor API", "url": "https://api.teamtailor.com", "source_type": "api", "category": "jobs", "is_active": 1},
        {"name": "Glassdoor RSS", "url": "https://glassdoor.com/rss", "source_type": "rss", "category": "salary", "is_active": 1},
        {"name": "HackerNews", "url": "https://news.ycombinator.com/rss", "source_type": "rss", "category": "hype", "is_active": 1},
        {"name": "X/Twitter Dev", "url": "https://api.twitter.com/dev", "source_type": "api", "category": "hype", "is_active": 1},
        {"name": "Threads API", "url": "https://api.threads.net", "source_type": "api", "category": "hype", "is_active": 1},
        {"name": "LinkedIn Jobs", "url": "https://linkedin.com/jobs", "source_type": "html_scrape", "category": "jobs", "is_active": 1},
    ]

    try:
        for source_data in sources_seed:
            stmt = insert(DataSource).values(**source_data)
            stmt = stmt.on_conflict_do_nothing(index_elements=["url"])
            session.execute(stmt)
        session.commit()
        print(f"✅ Seeded Data Sources.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding Data Sources: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    seed_historical_data()
    seed_eras()
    seed_geography()
    seed_sources()
