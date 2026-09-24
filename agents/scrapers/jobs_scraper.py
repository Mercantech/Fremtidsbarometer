import asyncio
import logging
import feedparser
import re
from datetime import datetime, timezone
from typing import List

from database.models import RawScrapeData, SourceLog, JobPosting, ATSCompany, SalaryData
from utils.logger import get_centralized_logger

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

TECH_KEYWORDS = (
    "developer", "software", "engineer", "data", "cloud", "devops", "architect",
    "security", "fullstack", "frontend", "backend", "system", "it ", "tech",
    "qa", "tester", "programmer", "analyst", "product", "scrum", "ai ", "machine learning",
    "python", "java", "react", "c#", ".net", "c++", "rust", "golang", "kubernetes", "aws", "azure"
)

def infer_technology(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ["python", "django", "fastapi"]):
        return "Python"
    if any(k in t for k in ["react", "vue", "angular", "frontend", "web dev"]):
        return "Frontend"
    if any(k in t for k in ["backend", "node", "golang", "rust", "java", "c#", ".net"]):
        return "Backend"
    if any(k in t for k in ["cloud", "devops", "kubernetes", "docker", "aws", "azure", "sre", "platform"]):
        return "Cloud & DevOps"
    if any(k in t for k in ["data", "machine learning", "ai ", "bi ", "scientist"]):
        return "Data & AI"
    if any(k in t for k in ["security", "cyber", "infosec", "soc"]):
        return "Cybersecurity"
    if any(k in t for k in ["qa", "test", "quality"]):
        return "QA & Testing"
    return "Software Engineering"

async def scrape_teamtailor_jobs(db, source_id: int = None) -> int:
    """
    Parses public RSS feeds of registered Teamtailor companies.
    Filters for genuine tech/IT positions, uses batch queries to eliminate N+1 latency,
    and saves structured JobPostings and RawScrapeData.
    """
    seed_ats_companies(db)
    companies = db.query(ATSCompany).filter(ATSCompany.ats_type == "teamtailor").all()
    saved_count = 0
    
    for company in companies:
        rss_url = f"https://{company.domain}.teamtailor.com/jobs.rss"
        logger.info(f"Fetching Teamtailor RSS: {rss_url}")
        
        try:
            feed = await asyncio.to_thread(feedparser.parse, rss_url)
            entries = getattr(feed, "entries", [])
            if not entries:
                continue

            company_name = company.domain.capitalize()[:200]
            
            # 1. Filter for tech jobs
            candidate_entries = []
            candidate_links = []
            for entry in entries:
                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                if not title or not link:
                    continue
                # Ensure it's a tech role
                if not any(k in title.lower() for k in TECH_KEYWORDS):
                    continue
                candidate_entries.append(entry)
                candidate_links.append(link)

            if not candidate_links:
                continue

            # 2. Batch check existing URLs (1 query instead of N queries)
            existing_links = set(
                r[0] for r in db.query(JobPosting.url).filter(JobPosting.url.in_(candidate_links)).all()
            )

            # 3. Insert new records
            new_jobs = []
            new_raw_entries = []
            for entry in candidate_entries:
                link = entry.get("link", "").strip()
                if link in existing_links:
                    continue

                title = entry.get("title", "").strip()
                description = entry.get("description", "").strip()
                tech_category = infer_technology(title)
                
                formatted_job = f"COMPANY: {company.domain}\nJOB_TITLE: {title}\nCATEGORY: {tech_category}\nURL: {link}\nDESCRIPTION:\n{description[:2500]}"
                
                new_raw_entries.append(RawScrapeData(
                    source_id=source_id,
                    country_code="DK",
                    raw_text=formatted_job,
                    extracted_urls=[link],
                    processed=0,
                    created_at=datetime.now(timezone.utc)
                ))

                new_jobs.append({
                    "title": title[:500],
                    "company": company_name,
                    "url": link[:1000],
                    "source": "teamtailor",
                    "country": "DK",
                    "city": "Copenhagen",
                    "technology": tech_category,
                    "tags": ["junior", tech_category.lower(), "teamtailor"],
                    "date": datetime.now(timezone.utc),
                    "match_score": 85.0,
                    "match_reason": f"Direct ATS vacancy: {tech_category}",
                    "status": "published"
                })

            if new_raw_entries:
                db.add_all(new_raw_entries)
            if new_jobs:
                # Deduplicate within batch by (title, company, source)
                deduped_jobs = []
                seen_keys = set()
                for j in new_jobs:
                    key = (j["title"], j["company"], j["source"])
                    if key not in seen_keys:
                        seen_keys.add(key)
                        deduped_jobs.append(j)

                stmt = pg_insert(JobPosting).values(deduped_jobs).on_conflict_do_nothing(
                    index_elements=["title", "company", "source"]
                )
                db.execute(stmt)
                saved_count += len(deduped_jobs)
                
            db.commit()
        except Exception as e:
            logger.error(f"Error scraping ATS {company.domain}: {e}")
            db.rollback()
            db.add(SourceLog(data_source_id=source_id or 1, error_message=str(e)))
            db.commit()

    logger.info(f"Teamtailor sweep finished. Saved {saved_count} tech jobs.")
    return saved_count
