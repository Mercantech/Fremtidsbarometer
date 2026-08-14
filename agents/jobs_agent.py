import asyncio
import logging
from datetime import datetime, timezone
import json
import re
import feedparser
import os
from dotenv import load_dotenv

from agents.base_agent import BaseAgent
from agents.scraper import PlaywrightScraper
from agents.ai_provider import GeminiProvider
from database.models import JobPosting, ATSCompany
from database.session import get_session

load_dotenv()

logger = logging.getLogger("JobsAgent")
logging.basicConfig(level=logging.INFO)

class JobsAgent(BaseAgent):
    def __init__(self):
        super().__init__("JobsAgent")
        self.scraper = PlaywrightScraper()
        self.ai = GeminiProvider()

    def seed_ats_companies(self, db):
        """Seed the DB with initial ATS companies if it is empty."""
        if db.query(ATSCompany).count() == 0:
            seeds = ["netnordic", "dfds", "securitas", "gire", "polestar", "bankdata", "puzzel", "vitecsoftware", "envidan"]
            for domain in seeds:
                db.add(ATSCompany(domain=domain, ats_type="teamtailor"))
            db.commit()
            self.logger.info("Seeded ATSCompany table with initial domains.")

    def auto_discover_ats(self, db, html: str):
        """Finds Teamtailor links in raw HTML and saves to DB."""
        matches = re.findall(r'href=["\']https?://([a-zA-Z0-9-]+)\.teamtailor\.com', html)
        discovered = 0
        for domain in set(matches):
            exists = db.query(ATSCompany).filter(ATSCompany.domain == domain).first()
            if not exists:
                db.add(ATSCompany(domain=domain, ats_type="teamtailor"))
                discovered += 1
        
        if discovered > 0:
            db.commit()
            self.logger.info(f"Auto-discovered {discovered} new Teamtailor companies!")

    async def fetch_teamtailor_jobs(self, db):
        """Parsing ATS Teamtailor via public RSS feed."""
        companies = db.query(ATSCompany).filter(ATSCompany.ats_type == "teamtailor").all()
        seen_urls = set()
        for company in companies:
            rss_url = f"https://{company.domain}.teamtailor.com/jobs.rss"
            self.logger.info(f"Fetching Teamtailor RSS: {rss_url}")
            
            feed = await asyncio.to_thread(feedparser.parse, rss_url)
            for entry in feed.entries:
                title = entry.get("title", "").lower()
                
                if any(kw in title for kw in ["junior", "elev", "student", "intern", "trainee", "developer", "engineer", "udvikler"]):
                    
                    link = entry.get("link", "")
                    if not link or link in seen_urls:
                        continue
                    seen_urls.add(link)
                    
                    description = entry.get("description", "")
                    
                    exists = db.query(JobPosting).filter(
                        JobPosting.url == link
                    ).first()
                    if exists:
                        continue
                        
                    self.logger.info(f"Found ATS job: {entry.get('title')} at {company.domain}")
                    
                    prompt = f"""
                    Analyze the job description: {entry.get('title')}.
                    Text: {description[:5000]}
                    
                    Extract the required technologies and explain if this is suitable for a Junior/Student role.
                    
                    ALL OUTPUT MUST BE IN ENGLISH.
                    """
                    
                    schema = """
                    JSON format:
                    {
                      "city": "City",
                      "technology": "Main language/technology",
                      "tags": ["tag1", "tag2"],
                      "match_reason": "Why it fits a junior"
                    }
                    """
                    
                    result = await self.ai.analyze_json(prompt, schema)
                    if not result:
                        continue
                        
                    new_job = JobPosting(
                        title=(entry.get("title") or "")[:500],
                        company=(company.domain.capitalize() or "")[:200],
                        url=(link or "")[:1000],
                        source="teamtailor",
                        country="DK/EU",
                        city=(result.get("city") or "")[:100],
                        technology=(result.get("technology") or "")[:100],
                        tags=result.get("tags") or [],
                        date=datetime.now(timezone.utc),
                        match_score=90.0,
                        match_reason=result.get("match_reason") or ""
                    )
                    db.add(new_job)
                    
            try:
                db.commit()
            except Exception as e:
                self.logger.error(f"Commit failed for company {company.domain}: {e}")
                db.rollback()

    async def fetch_aggregator_jobs(self, db):
        """Parsing aggregators (Jobindex, LinkedIn) via Playwright with Auto-Discovery."""
        await self.scraper.start()
        
        urls_to_scrape = [
            ("jobindex", "DK", "https://www.jobindex.dk/jobsoegning/it/systemudvikling?q=%27junior%27+OR+%27elev%27+OR+%27student%27"),
            ("linkedin", "EU", "https://www.linkedin.com/jobs/search?keywords=Junior%20Software%20Developer&location=Europe&f_TPR=r86400")
        ]
        
        for source, country, url in urls_to_scrape:
            self.logger.info(f"Scraping aggregator {source} ({country}) for Auto-Discovery and generic jobs...")
            
            # Get raw HTML for Auto-Discovery ATS
            html = await self.fetch_with_retry(self.scraper.get_page_html, url)
            if html:
                self.auto_discover_ats(db, html)

            # Get innerText for Gemini
            page_text = await self.fetch_with_retry(self.scraper.get_page_text, url)
            
            if not page_text or len(page_text) < 200:
                continue
            
            prompt = f"""
            Find IT jobs for students/juniors (junior, student, elev) from the following text: {page_text[:10000]}
            
            ALL EXTRACTED TEXT (ESPECIALLY 'match_reason') MUST BE IN ENGLISH.
            """
            
            schema = """
            JSON format:
            {
              "jobs": [
                {
                  "title": "Job Title",
                  "company": "Company Name",
                  "url": "URL if available",
                  "city": "City",
                  "technology": "Main tech",
                  "tags": ["tag1"],
                  "match_reason": "Reason"
                }
              ]
            }
            """
            
            result = await self.ai.analyze_json(prompt, schema)
            jobs = result.get("jobs", [])
            
            seen_urls = set()
            for job in jobs:
                job_title = job.get("title") or "Unknown Title"
                job_company = job.get("company") or "Unknown Company"
                job_url = job.get("url")
                if not job_url:
                    job_url = f"{url}#{job_company}_{job_title}".replace(" ", "_")

                if job_url in seen_urls:
                    continue
                seen_urls.add(job_url)

                exists = db.query(JobPosting).filter(
                    JobPosting.title == job_title,
                    JobPosting.company == job_company
                ).first()
                
                if not exists:
                    new_job = JobPosting(
                        title=job_title[:500],
                        company=job_company[:200],
                        url=job_url[:1000],
                        source=source[:50],
                        country=country[:10],
                        city=(job.get("city") or "")[:100],
                        technology=(job.get("technology") or "")[:100],
                        tags=job.get("tags") or [],
                        date=datetime.now(timezone.utc),
                        match_score=80.0,
                        match_reason=job.get("match_reason") or ""
                    )
                    db.add(new_job)
                    
            try:
                db.commit()
            except Exception as e:
                self.logger.error(f"Commit failed for {source}: {e}")
                db.rollback()
        db.commit()
        await self.scraper.stop()

    async def fetch_jobs(self):
        """Main method for hybrid scraping."""
        db = get_session()
        try:
            # Seed DB if empty
            self.seed_ats_companies(db)

            # 1. Scan aggregators first to catch new ATS domains and regular jobs
            await self.fetch_aggregator_jobs(db)

            # 2. Now parse all ATS (both old and newly found)
            await self.fetch_teamtailor_jobs(db)
            
            self.logger.info("Hybrid scraping completed successfully.")
        except Exception as e:
            self.logger.error(f"Jobs scraping failed: {e}")
            db.rollback()
            raise e
        finally:
            db.close()

if __name__ == "__main__":
    agent = JobsAgent()
    asyncio.run(agent.fetch_jobs())
