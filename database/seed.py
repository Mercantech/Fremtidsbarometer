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

from database.models import TechTrend, Era, GeographyGrid, DataSource, AIModelConfig
from database.session import get_session
from sqlalchemy.dialects.postgresql import insert

# Eras seed data
ERAS_SEED = [
    {
        "year": 1995,
        "title": "Web 1.0 Dawn",
        "subtitle": "Commercial web boom & basic CGI scripts",
        "stats": {
            "roles": [
                ["Webmaster", "HIGH", "Manages the entire website, from server setup to HTML coding."],
                ["Sysadmin", "$50k/YR", "Maintains servers, networks, and IT infrastructure."],
                ["C++ Dev", "CORE", "Builds high-performance backend systems and desktop software."],
                ["DBA (Oracle)", "ENTERPRISE", "Specialist in managing complex enterprise databases."],
                ["Network Engineer", "GROWING", "Designs and maintains network topologies for growing companies."],
                ["QA Tester", "NEW ROLE", "Manually tests software for bugs before release."]
            ],
            "stack": [
                ["HTML/CGI", "NEW", "Basic markup and Common Gateway Interface scripts for dynamic web pages."],
                ["Perl", "BACKEND", "The 'duct tape of the internet', used for CGI scripting and text processing."],
                ["C/C++", "SYSTEM", "Used for performance-critical components and web servers."],
                ["Oracle DB", "DATA", "Dominant enterprise relational database system."],
                ["Delphi", "DESKTOP", "Rapid application development tool for Windows software."],
                ["FTP/Telnet", "OPS", "Standard protocols for file transfer and remote server management."]
            ],
            "hypeTopic": "Dot-Com Boom",
            "hypeDesc": "Creation of the first commercial websites. The internet becomes accessible to the masses. Everyone wants their own website."
        }
    },
    {
        "year": 2008,
        "title": "Mobile & Cloud Era",
        "subtitle": "App Store launch & AWS Cloud standardization",
        "stats": {
            "roles": [
                ["iOS/Android Dev", "HOT", "Builds native applications for the booming smartphone market."],
                ["Fullstack", "$90k/YR", "Handles both frontend interfaces and backend APIs."],
                ["Scrum Master", "TREND", "Facilitates Agile development processes within teams."],
                ["Cloud Architect", "EMERGING", "Designs scalable infrastructure on public clouds like AWS."],
                ["UX Designer", "GROWING", "Focuses on user experience and interface usability."],
                ["QA Automation", "STANDARD", "Writes scripts to automatically test software functionality."]
            ],
            "stack": [
                ["Objective-C", "MOBILE", "Primary language for developing iOS applications."],
                ["Java", "ENTERPRISE", "Standard language for large-scale enterprise backends and Android."],
                ["Ruby on Rails", "STARTUPS", "Popular framework for rapid web application development."],
                ["jQuery", "FRONTEND", "Simplifies JavaScript HTML DOM traversal and manipulation."],
                ["MySQL/Postgres", "DATA", "Leading open-source relational database management systems."],
                ["AWS EC2/S3", "INFRA", "Foundational cloud computing and storage services."]
            ],
            "hypeTopic": "App Economy",
            "hypeDesc": "Mobile applications change the market. The launch of AWS makes cloud infrastructure the standard."
        }
    },
    {
        "year": 2018,
        "title": "Cloud Native & Crypto",
        "subtitle": "Kubernetes orchestration & Microservices",
        "stats": {
            "roles": [
                ["DevOps/SRE", "CRITICAL", "Bridges development and operations, ensuring system reliability."],
                ["Data Scientist", "SEXY", "Analyzes large datasets to extract insights and build predictive models."],
                ["Web3 Dev", "NICHE", "Develops decentralized applications and smart contracts on blockchains."],
                ["ML Engineer", "$140k/YR", "Deploys machine learning models into production environments."],
                ["Platform Eng.", "RISING", "Builds internal developer platforms to improve engineering efficiency."],
                ["Product Manager", "HOT", "Guides the strategy, development, and launch of products."]
            ],
            "stack": [
                ["Go/Docker", "INFRA", "Go for microservices, Docker for containerizing applications."],
                ["Python", "DATA", "Dominant language for data science, AI, and scripting."],
                ["React/Vue", "FRONTEND", "Leading component-based JavaScript frameworks for building UIs."],
                ["Kubernetes", "ORCHESTRATION", "Industry standard for automating deployment and scaling of containers."],
                ["TensorFlow", "ML", "Open-source library for machine learning and artificial intelligence."],
                ["GraphQL", "API", "Query language for APIs, allowing clients to request exactly what they need."]
            ],
            "hypeTopic": "Blockchain & Microservices",
            "hypeDesc": "Decentralization, smart contracts, and the enterprise transition to microservice architecture."
        }
    },
    {
        "year": 2026,
        "title": "AI Agents Era",
        "subtitle": "Autonomous LLMs, System Logic & Agentic Workflows",
        "stats": {
            "roles": [
                ["Backend (Go/C#)", "HIGH DEMAND", "Engineers building robust, scalable APIs and microservices."],
                ["AI Integrator", "$130k/YR", "Specializes in embedding LLMs and AI capabilities into existing products."],
                ["DevOps Arch.", "CORE", "Designs high-level cloud architecture and deployment pipelines."],
                ["Prompt Engineer", "EMERGING", "Crafts and optimizes prompts to extract the best responses from LLMs."],
                ["MLOps Engineer", "CRITICAL", "Manages the lifecycle, scaling, and monitoring of ML models in production."],
                ["Security Eng.", "RISING", "Protects systems against increasingly sophisticated, AI-driven cyber threats."]
            ],
            "stack": [
                ["Python", "AI CORE", "The lingua franca of AI, machine learning, and data engineering."],
                ["Go", "MICROSERVICES", "Preferred for building fast, concurrent, and scalable backend services."],
                ["TypeScript", "WEB STD", "Strict syntactical superset of JavaScript, standard for web development."],
                ["Rust", "SYSTEMS", "Memory-safe systems programming language for high-performance components."],
                ["LangChain", "AGENTS", "Framework for developing applications powered by language models."],
                ["Terraform", "IaC", "Infrastructure as Code tool for building, changing, and versioning infrastructure safely."]
            ],
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


def seed_ai_models():
    session = get_session()
    print("🤖 Seeding AI Model Configurations...")
    
    models_seed = [
        # Social Sweep
        {"task_type": "social_extraction", "model_name": "gemini-3.6-flash", "provider": "google", "is_active": 1, "is_fallback": 0},
        {"task_type": "social_extraction", "model_name": "gemini-3.5-flash", "provider": "google", "is_active": 0, "is_fallback": 1},
        
        # Tech Sweep
        {"task_type": "tech_extraction", "model_name": "gemini-3.6-flash", "provider": "google", "is_active": 1, "is_fallback": 0},
        {"task_type": "tech_extraction", "model_name": "gemini-3.5-flash", "provider": "google", "is_active": 0, "is_fallback": 1},
        
        # Jobs Sweep
        {"task_type": "jobs_extraction", "model_name": "gemini-3.6-flash", "provider": "google", "is_active": 1, "is_fallback": 0},
        {"task_type": "jobs_extraction", "model_name": "gemini-3.5-flash", "provider": "google", "is_active": 0, "is_fallback": 1},
        
        # Final Synthesis
        {"task_type": "final_synthesis", "model_name": "gemini-3.1-pro", "provider": "google", "is_active": 1, "is_fallback": 0},
        {"task_type": "final_synthesis", "model_name": "gemini-3.6-flash", "provider": "google", "is_active": 0, "is_fallback": 1},
    ]

    try:
        for m in models_seed:
            existing = session.query(AIModelConfig).filter(
                AIModelConfig.task_type == m["task_type"],
                AIModelConfig.model_name == m["model_name"]
            ).first()
            if not existing:
                session.add(AIModelConfig(**m))
        session.commit()
        print("✅ Seeded AI Model Configurations.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding AI Model Configurations: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    seed_historical_data()
    seed_eras()
    seed_geography()
    seed_sources()
    seed_ai_models()

