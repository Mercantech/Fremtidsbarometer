from database.models import DataSource
from sqlalchemy.dialects.postgresql import insert

SOURCES_SEED = [
    # ── Category 1: ATS & Tech Jobs (European Companies & Aggregators) ──
    {"name": "TeamTailor: DFDS Tech (Denmark/Nordics)", "url": "https://dfds.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Bankdata IT (Denmark)", "url": "https://bankdata.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Securitas Engineering (EU)", "url": "https://securitas.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Vitec Software Nordic", "url": "https://vitecsoftware.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Envidan Digital Tech", "url": "https://envidan.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Gire Mobility Systems", "url": "https://gire.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Lunar Fintech (Denmark)", "url": "https://lunar.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Polestar Automotive Tech", "url": "https://polestar.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Podimo Streaming Tech", "url": "https://podimo.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Labster VR & EdTech", "url": "https://labster.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Vivino Global Tech", "url": "https://vivino.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "TeamTailor: Tibber Smart Energy Tech", "url": "https://tibber.teamtailor.com/jobs.rss", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "EuroTechJobs: Software Engineering Feed", "url": "https://www.eurotechjobs.com/rss", "source_type": "rss", "category": "jobs", "is_active": 1},

    # ── Ukrainian Tech Job Aggregators (Djinni & DOU) ──
    {"name": "Djinni: All Tech Jobs (Ukraine/Remote)", "url": "https://djinni.co/jobs/rss/", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "Djinni: Python Vacancies", "url": "https://djinni.co/jobs/rss/?primary_keyword=Python", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "Djinni: JavaScript & Web Vacancies", "url": "https://djinni.co/jobs/rss/?primary_keyword=JavaScript", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "DOU: Python Vacancies (Ukraine)", "url": "https://jobs.dou.ua/vacancies/feeds/?category=Python", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "DOU: Frontend Vacancies (Ukraine)", "url": "https://jobs.dou.ua/vacancies/feeds/?category=Front+End", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "DOU: DevOps Vacancies (Ukraine)", "url": "https://jobs.dou.ua/vacancies/feeds/?category=DevOps", "source_type": "rss", "category": "jobs", "is_active": 1},
    {"name": "DOU: QA Vacancies (Ukraine)", "url": "https://jobs.dou.ua/vacancies/feeds/?category=QA", "source_type": "rss", "category": "jobs", "is_active": 1},

    # ── European Tech Job JSON APIs (Germany, Austria & Pan-European) ──
    {"name": "Arbeitnow: European Tech & IT Jobs", "url": "https://www.arbeitnow.com/api/job-board-api", "source_type": "api", "category": "jobs", "is_active": 1},

    # ── Category 2: Social & Developer Discussions (Dev.to & Lobste.rs) ──
    # Note: Dev.to and Lobste.rs provide open, reliable technical discussion APIs.
    {"name": "Dev.to: AI & Machine Learning", "url": "https://dev.to/t/ai", "source_type": "api", "category": "social", "is_active": 1},
    {"name": "Dev.to: DevOps & Cloud Architecture", "url": "https://dev.to/t/devops", "source_type": "api", "category": "social", "is_active": 1},
    {"name": "Dev.to: Software Architecture", "url": "https://dev.to/t/architecture", "source_type": "api", "category": "social", "is_active": 1},
    {"name": "Dev.to: Web & Frontend Ecosystem", "url": "https://dev.to/t/webdev", "source_type": "api", "category": "social", "is_active": 1},
    {"name": "Dev.to: Cybersecurity & SecOps", "url": "https://dev.to/t/security", "source_type": "api", "category": "social", "is_active": 1},

    # ── Category 3: Technical Signals & Code Repositories ──
    {"name": "HackerNews: Top Stories & Discussions", "url": "https://news.ycombinator.com/rss", "source_type": "rss", "category": "tech", "is_active": 1},
    {"name": "GitHub Trending: All Languages", "url": "https://github.com/trending", "source_type": "html_scrape", "category": "tech", "is_active": 1},
    {"name": "GitHub Trending: Python Ecosystem", "url": "https://github.com/trending/python", "source_type": "html_scrape", "category": "tech", "is_active": 1},
    {"name": "GitHub Trending: Rust Systems", "url": "https://github.com/trending/rust", "source_type": "html_scrape", "category": "tech", "is_active": 1},
    {"name": "GitHub Trending: TypeScript & Web", "url": "https://github.com/trending/typescript", "source_type": "html_scrape", "category": "tech", "is_active": 1},
    {"name": "GitHub Trending: Go Systems", "url": "https://github.com/trending/go", "source_type": "html_scrape", "category": "tech", "is_active": 1},
    {"name": "Lobste.rs: Hottest Technical Discussions", "url": "https://lobste.rs/hottest.json", "source_type": "api", "category": "tech", "is_active": 1},
    {"name": "Lobste.rs: AI & Machine Learning Stories", "url": "https://lobste.rs/t/ai.json", "source_type": "api", "category": "tech", "is_active": 1},

    # ── Category 4: Real-Time Tech & Industry News ──
    {"name": "Google News: Technology Headlines", "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "Google News: Artificial Intelligence", "url": "https://news.google.com/rss/search?q=Artificial+Intelligence&hl=en-US&gl=US&ceid=US:en", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "Google News: Cloud & Cybersecurity", "url": "https://news.google.com/rss/search?q=Cloud+Cybersecurity+Software&hl=en-US&gl=US&ceid=US:en", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "Ars Technica: Technology Lab", "url": "https://feeds.arstechnica.com/arstechnica/technology-lab", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "The Verge: Tech & AI", "url": "https://www.theverge.com/rss/index.xml", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "TechCrunch: Venture & Emerging Tech", "url": "https://techcrunch.com/feed/", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "InfoQ: Software Architecture & Dev", "url": "https://feed.infoq.com/", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "VentureBeat: AI & Big Data", "url": "https://venturebeat.com/feed/", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "MIT Technology Review: AI & Computing", "url": "https://www.technologyreview.com/feed/", "source_type": "rss", "category": "news", "is_active": 1},
    {"name": "ZDNet: Enterprise IT & Software", "url": "https://www.zdnet.com/news/rss.xml", "source_type": "rss", "category": "news", "is_active": 1},

    # ── Category 5: Developer Salaries & Market Benchmarks ──
    {"name": "RemoteOK: Developer Salaries & Tech Jobs", "url": "https://remoteok.com/api", "source_type": "api", "category": "salary", "is_active": 1},
    {"name": "Levels.fyi: Tech Compensation Benchmarks", "url": "https://www.levels.fyi", "source_type": "api", "category": "salary", "is_active": 1},
]

def seed_sources(session):
    """Seeds default verified data sources and cleans up legacy placeholders."""
    print("📡 Seeding Data Sources...")
    try:
        # Clean up obsolete placeholder URLs and blocked Reddit sources
        session.query(DataSource).filter(
            (DataSource.url.in_(["https://api.teamtailor.com", "https://api.twitter.com/dev", "https://api.threads.net"])) |
            (DataSource.name.ilike("%Reddit%")) |
            (DataSource.url.ilike("%reddit.com%"))
        ).delete(synchronize_session=False)

        for source_data in SOURCES_SEED:
            stmt = insert(DataSource).values(**source_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=["url"],
                set_={
                    "name": source_data["name"],
                    "source_type": source_data["source_type"],
                    "category": source_data["category"],
                }
            )
            session.execute(stmt)
        session.commit()
        print(f"✅ Successfully seeded {len(SOURCES_SEED)} verified Data Sources.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding Data Sources: {e}")
        raise e
