"""
Data Source Service.
Encapsulates single-source ingestion routing and dispatching for admin triggers.
"""

import httpx
from typing import Optional
from sqlalchemy.orm import Session
from database.models import DataSource
from utils.logger import get_centralized_logger

logger = get_centralized_logger("DataSourceService")


async def dispatch_source_ingestion(source: DataSource, db: Session) -> int:
    """
    Dispatches on-demand ingestion for a single DataSource to the corresponding scraper.
    Returns the number of saved/updated records.
    """
    category = (source.category or "").lower().strip()
    url_lower = (source.url or "").lower().strip()
    name_lower = (source.name or "").lower().strip()

    if category == "jobs":
        from agents.scrapers.jobs_scraper import scrape_single_job_source
        return await scrape_single_job_source(source, db)

    if category == "salary":
        from agents.scrapers.salary_scraper import scrape_developer_salaries
        return await scrape_developer_salaries(db, source_id=source.id)

    if category == "news":
        from agents.news_agent import scrape_single_news_source
        return await scrape_single_news_source(source, db)

    if category in ("social", "tech"):
        if "hackernews" in name_lower or "news.ycombinator.com" in url_lower:
            from agents.scrapers.tech_scraper import scrape_hackernews
            return await scrape_hackernews(db, source_id=source.id)

        if "github" in name_lower or "github.com" in url_lower:
            from agents.scrapers.tech_scraper import scrape_github_trending
            return await scrape_github_trending(db, source_id=source.id)

        if "lobste.rs" in url_lower:
            from agents.scrapers.social_scraper import scrape_lobsters
            async with httpx.AsyncClient(timeout=15.0) as client:
                return await scrape_lobsters(client, db, source_id=source.id)

        if "dev.to" in url_lower:
            from agents.scrapers.social_scraper import scrape_dev_to
            async with httpx.AsyncClient(timeout=15.0) as client:
                return await scrape_dev_to(client, db, source_id=source.id)

        if source.source_type == "rss" or url_lower.endswith((".rss", ".xml", ".atom")) or "/rss" in url_lower:
            from agents.scrapers.social_scraper import scrape_generic_discussion_rss
            return await scrape_generic_discussion_rss(source, db)

    # Fallback to jobs scraper
    from agents.scrapers.jobs_scraper import scrape_single_job_source
    return await scrape_single_job_source(source, db)
