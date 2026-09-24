import asyncio
import logging
import feedparser
import re
from datetime import datetime, timezone
from typing import List, Tuple, Optional

from database.models import RawScrapeData, SourceLog, JobPosting, ATSCompany
from utils.logger import get_centralized_logger
from sqlalchemy.dialects.postgresql import insert as pg_insert

logger = get_centralized_logger("JobsScraper")

def seed_ats_companies(db):
    """Seed the DB with initial ATS companies if empty."""
    if db.query(ATSCompany).count() == 0:
        seeds = ["netnordic", "dfds", "securitas", "gire", "polestar", "bankdata", "puzzel", "vitecsoftware", "envidan"]
        for domain in seeds:
            db.add(ATSCompany(domain=domain, ats_type="teamtailor"))
        db.commit()
        logger.info("Seeded initial ATS companies.")

TECH_KEYWORDS = (
    "developer", "software", "engineer", "data", "cloud", "devops", "architect",
    "security", "fullstack", "frontend", "backend", "system", "it ", "tech",
    "qa", "tester", "programmer", "analyst", "product", "scrum", "ai ", "machine learning",
    "python", "java", "react", "c#", ".net", "c++", "rust", "golang", "kubernetes", "aws", "azure"
)

EXCLUDE_KEYWORDS = (
    "driver", "warehouse", "officier", "steward", "stewardess", "chef", "cook",
    "cleaning", "skib", "fragt", "matros", "sailor", "marine engineer",
    "maskinmester", "nurse", "læge", "electrician", "mekaniker", "mechanic",
    "welder", "painter", "chauffør", "logistiek", "lager", "speditør", "shunter", "catering"
)

COMPANY_DEFAULT_LOCATIONS = {
    "netnordic": ("NO", "Oslo"),
    "dfds": ("DK", "Copenhagen"),
    "securitas": ("SE", "Stockholm"),
    "gire": ("NO", "Oslo"),
    "polestar": ("SE", "Gothenburg"),
    "bankdata": ("DK", "Silkeborg"),
    "puzzel": ("NO", "Oslo"),
    "vitecsoftware": ("SE", "Umeå"),
    "envidan": ("DK", "Silkeborg")
}

LOCATION_PATTERNS = [
    (r"\b(copenhagen|københavn)\b", ("DK", "Copenhagen")),
    (r"\b(aarhus|århus)\b", ("DK", "Aarhus")),
    (r"\b(odense)\b", ("DK", "Odense")),
    (r"\b(aalborg)\b", ("DK", "Aalborg")),
    (r"\b(silkeborg)\b", ("DK", "Silkeborg")),
    (r"\b(stockholm)\b", ("SE", "Stockholm")),
    (r"\b(gothenburg|göteborg)\b", ("SE", "Gothenburg")),
    (r"\b(malm[öo])\b", ("SE", "Malmö")),
    (r"\b(oslo)\b", ("NO", "Oslo")),
    (r"\b(bergen)\b", ("NO", "Bergen")),
    (r"\b(trondheim)\b", ("NO", "Trondheim")),
    (r"\b(berlin)\b", ("DE", "Berlin")),
    (r"\b(munich|münchen)\b", ("DE", "Munich")),
    (r"\b(london)\b", ("UK", "London")),
    (r"\b(remote|hejmearbejde|distans)\b", ("GLOBAL", "Remote")),
]

SALARY_PATTERNS = [
    r'[$€£]\s*\d{2,4}k\s*(?:-|to|–)\s*[$€£]?\s*\d{2,4}k',
    r'(?:[$€£]|DKK|SEK|NOK|USD|EUR)\s*\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:-|to|–)\s*(?:[$€£]|DKK|SEK|NOK|USD|EUR)?\s*\d{1,3}(?:[.,]\d{3})*(?:k)?(?:\s*(?:DKK|SEK|NOK|USD|EUR|GBP|kr|per month|/mo|/year|yearly))?',
    r'\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:-|to|–)\s*\d{1,3}(?:[.,]\d{3})*(?:k)?\s*(?:[$€£]|DKK|SEK|NOK|USD|EUR|GBP|kr)(?:\s*(?:per month|/mo|/year|yearly))?',
]

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

def infer_seniority(title: str, description: str = "") -> str:
    combined = (title + " " + description[:400]).lower()
    if any(w in combined for w in ["lead", "principal", "staff", "head of", "director", "architect", "manager", "tech lead"]):
        return "lead"
    if any(w in combined for w in ["senior", "sr.", "sr ", "experienced", "specialist"]):
        return "senior"
    if any(w in combined for w in ["junior", "jr.", "jr ", "intern", "trainee", "entry level", "student", "graduate", "associate"]):
        return "junior"
    return "mid"

def infer_location(title: str, description: str, company_domain: str) -> Tuple[str, str]:
    text = (title + " " + description[:800]).lower()
    for pattern, loc in LOCATION_PATTERNS:
        if re.search(pattern, text):
            return loc
    return COMPANY_DEFAULT_LOCATIONS.get(company_domain.lower(), ("GLOBAL", "Remote"))

def extract_salary(text: str) -> Optional[str]:
    for pattern in SALARY_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return None

def calculate_match_score(title: str, description: str, tech_category: str) -> Tuple[float, str]:
    t_lower = (title + " " + description[:600]).lower()
    matched = [k for k in TECH_KEYWORDS if k in t_lower]
    base_score = 72.0 + min(len(matched) * 3.5, 20.0)
    score = round(min(base_score, 98.0), 1)
    reason = f"Identified {tech_category} role (signals: {', '.join(matched[:3])})"
    return score, reason

async def scrape_teamtailor_jobs(db, source_id: int = None) -> int:
    """
    Parses public RSS feeds of registered Teamtailor companies.
    Filters for genuine tech/IT positions, extracts location & seniority,
    discovers salary disclosures, and saves structured JobPostings and RawScrapeData.
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
            
            # 1. Filter for tech jobs and exclude irrelevant non-tech roles
            candidate_entries = []
            candidate_links = []
            for entry in entries:
                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                if not title or not link:
                    continue
                title_lower = title.lower()
                
                # Exclude obvious non-tech trades
                if any(ex in title_lower for ex in EXCLUDE_KEYWORDS):
                    continue
                    
                # Ensure it contains technical keywords
                if not any(k in title_lower for k in TECH_KEYWORDS):
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
                seniority = infer_seniority(title, description)
                country, city = infer_location(title, description, company.domain)
                score, reason = calculate_match_score(title, description, tech_category)
                salary_text = extract_salary(description)
                
                tags = [seniority, tech_category.lower(), "teamtailor"]
                if salary_text:
                    tags.append("salary_disclosed")
                
                formatted_job = (
                    f"COMPANY: {company.domain}\n"
                    f"JOB_TITLE: {title}\n"
                    f"CATEGORY: {tech_category}\n"
                    f"SENIORITY: {seniority}\n"
                    f"LOCATION: {city}, {country}\n"
                    f"URL: {link}\n"
                )
                if salary_text:
                    formatted_job += f"SALARY: {salary_text}\n"
                formatted_job += f"DESCRIPTION:\n{description[:2500]}"
                
                new_raw_entries.append(RawScrapeData(
                    source_id=source_id,
                    country_code=country,
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
                    "country": country,
                    "city": city,
                    "technology": tech_category,
                    "tags": tags,
                    "date": datetime.now(timezone.utc),
                    "match_score": score,
                    "match_reason": reason,
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

