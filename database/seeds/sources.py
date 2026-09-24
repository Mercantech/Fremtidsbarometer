from database.models import DataSource
from sqlalchemy.dialects.postgresql import insert

SOURCES_SEED = [
    {"name": "TeamTailor API", "url": "https://api.teamtailor.com", "source_type": "api", "category": "jobs", "is_active": 1},
    {"name": "HackerNews RSS", "url": "https://news.ycombinator.com/rss", "source_type": "rss", "category": "tech", "is_active": 1},
    {"name": "GitHub Trending", "url": "https://github.com/trending", "source_type": "html_scrape", "category": "tech", "is_active": 1},
    {"name": "Reddit Discussions", "url": "https://www.reddit.com", "source_type": "api", "category": "social", "is_active": 1},
    {"name": "Lobste.rs Discussions", "url": "https://lobste.rs", "source_type": "api", "category": "tech", "is_active": 1},
    {"name": "Google News Technology", "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "RemoteOK Developer Salaries API", "url": "https://remoteok.com/api", "source_type": "api", "category": "salary", "is_active": 1},
]

def seed_sources(session):
    """Seeds default data sources."""
    print("📡 Seeding Data Sources...")
    try:
        for source_data in SOURCES_SEED:
            stmt = insert(DataSource).values(**source_data)
            stmt = stmt.on_conflict_do_nothing(index_elements=["url"])
            session.execute(stmt)
        session.commit()
        print("✅ Seeded Data Sources.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding Data Sources: {e}")
