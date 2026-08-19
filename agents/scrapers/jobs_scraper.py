import asyncio
import logging
import feedparser
import re
from datetime import datetime, timezone
from typing import List

from database.models import RawScrapeData, SourceLog, JobPosting, ATSCompany, SalaryData
from utils.logger import get_centralized_logger
from agents.scraper import PlaywrightScraper

logger = get_centralized_logger("JobsScraper")

def seed_ats_companies(db):
    """Seed the DB with initial ATS companies if empty."""
    if db.query(ATSCompany).count() == 0:
        seeds = ["netnordic", "dfds", "securitas", "gire", "polestar", "bankdata", "puzzel", "vitecsoftware", "envidan"]
        for domain in seeds:
            db.add(ATSCompany(domain=domain, ats_type="teamtailor"))
        db.commit()
        logger.info("Seeded initial ATS companies.")

from sqlalchemy.dialects.postgresql import insert as pg_insert

async def scrape_teamtailor_jobs(db, source_id: int = None) -> int:
    """
    Parses public RSS feeds of all registered Teamtailor companies.
    Dumps full job descriptions into raw_scrape_data and inserts JobPosting records.
    """
    seed_ats_companies(db)
    companies = db.query(ATSCompany).filter(ATSCompany.ats_type == "teamtailor").all()
    saved_count = 0
    
    for company in companies:
        rss_url = f"https://{company.domain}.teamtailor.com/jobs.rss"
        logger.info(f"Fetching Teamtailor RSS: {rss_url}")
        
        try:
            feed = await asyncio.to_thread(feedparser.parse, rss_url)
            for entry in getattr(feed, "entries", []):
                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                description = entry.get("description", "").strip()
                
                if not title or not link:
                    continue
                    
                company_name = company.domain.capitalize()[:200]
                
                # Check if exists by URL or by (title, company, source)
                exists = db.query(JobPosting).filter(
                    (JobPosting.url == link) | 
                    ((JobPosting.title == title[:500]) & (JobPosting.company == company_name) & (JobPosting.source == "teamtailor"))
                ).first()
                if exists:
                    continue
                    
                formatted_job = f"COMPANY: {company.domain}\nJOB_TITLE: {title}\nURL: {link}\nDESCRIPTION:\n{description[:2500]}"
                
                # 1. Save raw dump for AI Synthesizer
                raw_entry = RawScrapeData(
                    source_id=source_id,
                    country_code="DK",
                    raw_text=formatted_job,
                    extracted_urls=[link],
                    processed=0,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(raw_entry)
                
                # 2. Add basic structured job safely
                stmt = pg_insert(JobPosting).values(
                    title=title[:500],
                    company=company_name,
                    url=link[:1000],
                    source="teamtailor",
                    country="DK",
                    city="Copenhagen",
                    technology="General IT",
                    tags=["junior", "teamtailor"],
                    date=datetime.now(timezone.utc),
                    match_score=85.0,
                    match_reason="Direct ATS vacancy",
                    status="published"
                ).on_conflict_do_nothing(index_elements=["title", "company", "source"])
                
                db.execute(stmt)
                saved_count += 1
                
            db.commit()
        except Exception as e:
            logger.error(f"Error scraping ATS {company.domain}: {e}")
            db.rollback()
            db.add(SourceLog(data_source_id=source_id or 1, error_message=str(e)))
            db.commit()

    logger.info(f"Teamtailor sweep finished. Saved {saved_count} jobs.")
    return saved_count
