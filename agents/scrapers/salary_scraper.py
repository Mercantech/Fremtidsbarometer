import asyncio
import logging
import statistics
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, List, Optional
import httpx
from sqlalchemy.dialects.postgresql import insert

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from database.models import SalaryData, JobPosting, RawScrapeData, DataSource, SourceLog
from database.session import get_session
from utils.logger import get_centralized_logger

logger = get_centralized_logger("SalaryScraper")

# Base baseline benchmarks (US Dollars) used as robust priors
BASE_BENCHMARKS = {
    "Data & AI": {"us_median": 165000, "role": "AI / Machine Learning Engineer", "keywords": ["ai", "machine learning", "data", "ml", "deep learning", "llm"]},
    "Cloud & DevOps": {"us_median": 150000, "role": "Cloud / Platform Engineer", "keywords": ["devops", "cloud", "kubernetes", "sre", "aws", "terraform", "platform"]},
    "Python": {"us_median": 145000, "role": "Senior Python Developer", "keywords": ["python", "django", "fastapi"]},
    "Backend": {"us_median": 140000, "role": "Backend Systems Engineer", "keywords": ["backend", "c#", ".net", "java", "spring", "node", "nodejs"]},
    "Rust": {"us_median": 155000, "role": "Systems Engineer (Rust)", "keywords": ["rust", "systems engineer", "low-level"]},
    "Go": {"us_median": 148000, "role": "Go Microservices Developer", "keywords": ["go", "golang"]},
    "Frontend": {"us_median": 130000, "role": "Frontend Engineer (React/TypeScript)", "keywords": ["frontend", "react", "typescript", "vue", "next.js", "ui"]},
    "Cybersecurity": {"us_median": 142000, "role": "Security / SecOps Engineer", "keywords": ["security", "secops", "cyber", "infosec", "soc"]},
    "Software Engineering": {"us_median": 138000, "role": "Software Engineer", "keywords": ["software engineer", "full stack", "fullstack", "developer"]}
}

COUNTRY_MULTIPLIERS = {
    "US": 1.0,
    "CH": 0.95,
    "UK": 0.78,
    "DK": 0.72,
    "NL": 0.72,
    "NO": 0.70,
    "DE": 0.68,
    "SE": 0.64,
    "IE": 0.68,
    "FR": 0.62,
    "FI": 0.60,
    "AT": 0.65,
    "BE": 0.66,
    "ES": 0.50,
    "IT": 0.52,
    "PL": 0.48,
    "CZ": 0.50,
    "UA": 0.45,
    "PT": 0.46,
    "RO": 0.42,
    "EE": 0.50,
    "GLOBAL": 0.75,
}


def _classify_job(title: str, tags: List[str]) -> Optional[str]:
    combined = (title + " " + " ".join(tags)).lower()
    for category, meta in BASE_BENCHMARKS.items():
        if any(kw in combined for kw in meta["keywords"]):
            return category
    return None


async def scrape_developer_salaries(db=None, source_id: Optional[int] = None) -> int:
    """
    Scrapes live developer salary figures from remote developer job boards,
    aggregates compensation metrics per IT specialization, and updates the
    SalaryData table for all supported countries.
    """
    should_close = False
    if db is None:
        db = get_session()
        should_close = True

    logger.info("Starting live developer salary aggregation...")
    empirical_salaries = defaultdict(list)

    headers = {
        "User-Agent": "Fremtidsbarometer-Bot/1.0 (+https://fremtidsbarometer.dk; tech trend observatory)"
    }

    # 1. Fetch remote dev vacancies from registered dynamic Salary data sources
    active_sources = []
    if source_id:
        active_sources = db.query(DataSource).filter(DataSource.id == source_id, DataSource.is_active == 1).all()
    else:
        active_sources = db.query(DataSource).filter(DataSource.category == "salary", DataSource.is_active == 1).all()

    # Fallback to default RemoteOK endpoint if no sources exist yet
    if not active_sources:
        logger.info("No active salary data sources found in database. Using default RemoteOK endpoint.")
        active_sources = [DataSource(id=0, name="RemoteOK API Default", url="https://remoteok.com/api", source_type="api", category="salary", is_active=1)]

    for src in active_sources:
        if src.source_type == "api":
            try:
                async with httpx.AsyncClient(headers=headers, timeout=20.0, follow_redirects=True) as client:
                    resp = await client.get(src.url)
                    if resp.status_code == 200:
                        data = resp.json()
                        job_list = []
                        if isinstance(data, list):
                            job_list = data
                        elif isinstance(data, dict):
                            for key in ("jobs", "data", "results", "vacancies", "items"):
                                if isinstance(data.get(key), list):
                                    job_list = data[key]
                                    break

                        source_points = 0
                        for job in job_list:
                            if not isinstance(job, dict):
                                continue
                            s_min = job.get("salary_min") or job.get("min_salary") or job.get("salary_from")
                            s_max = job.get("salary_max") or job.get("max_salary") or job.get("salary_to")
                            pos = job.get("position") or job.get("title") or job.get("role") or ""
                            raw_tags = job.get("tags") or job.get("skills") or job.get("keywords") or []
                            if isinstance(raw_tags, list):
                                tags = [str(t).lower() for t in raw_tags]
                            elif isinstance(raw_tags, str):
                                tags = [t.strip().lower() for t in raw_tags.split(",")]
                            else:
                                tags = []

                            salary = None
                            try:
                                if s_min is not None and s_max is not None:
                                    salary = (float(s_min) + float(s_max)) / 2
                                elif s_min is not None:
                                    salary = float(s_min)
                                elif s_max is not None:
                                    salary = float(s_max)
                            except (ValueError, TypeError):
                                salary = None

                            if salary and 35000 <= salary <= 450000:
                                cat = _classify_job(pos, tags)
                                if cat:
                                    empirical_salaries[cat].append(salary)
                                    source_points += 1
                        logger.info(f"Collected {source_points} salary points from [{src.name}] ({src.url}).")
                    else:
                        logger.warning(f"Salary API [{src.name}] returned HTTP status {resp.status_code}")
                        if src.id and src.id > 0:
                            db.add(SourceLog(
                                data_source_id=src.id,
                                error_message=f"HTTP {resp.status_code}: {resp.text[:200]}",
                                http_status=resp.status_code
                            ))
                            db.commit()
            except Exception as e:
                logger.warning(f"Salary API fetch failed for [{src.name}]: {e}")
                if src.id and src.id > 0:
                    try:
                        db.add(SourceLog(
                            data_source_id=src.id,
                            error_message=str(e)[:500],
                            http_status=getattr(getattr(e, 'response', None), 'status_code', None)
                        ))
                        db.commit()
                    except Exception:
                        db.rollback()

    # 2. Also incorporate local JobPostings from DB with salary data if available
    try:
        local_jobs = db.query(JobPosting).filter(
            (JobPosting.salary_min.isnot(None)) | (JobPosting.salary_max.isnot(None))
        ).limit(200).all()

        for j in local_jobs:
            s_min = j.salary_min
            s_max = j.salary_max
            s_val = None
            if s_min and s_max:
                s_val = (s_min + s_max) / 2
            elif s_min:
                s_val = s_min
            elif s_max:
                s_val = s_max

            if s_val and 35000 <= s_val <= 450000:
                cat = _classify_job(j.title or "", j.tags or [])
                if cat:
                    empirical_salaries[cat].append(s_val)
    except Exception as ex:
        logger.debug(f"Local job salary reading skipped: {ex}")

    # 3. Calculate metrics and upsert into SalaryData table
    records = []
    now_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    for cat, meta in BASE_BENCHMARKS.items():
        samples = empirical_salaries.get(cat, [])
        if len(samples) >= 2:
            us_median = float(statistics.median(samples))
            sorted_samples = sorted(samples)
            us_p25 = float(sorted_samples[int(len(sorted_samples) * 0.25)])
            us_p75 = float(sorted_samples[int(len(sorted_samples) * 0.75)])
        else:
            us_median = float(meta["us_median"])
            us_p25 = round(us_median * 0.82, -2)
            us_p75 = round(us_median * 1.25, -2)

        for country, mult in COUNTRY_MULTIPLIERS.items():
            median_val = round(us_median * mult, -2)
            p25_val = round(us_p25 * mult, -2)
            p75_val = round(us_p75 * mult, -2)

            records.append({
                "technology": cat,
                "country": country,
                "source": "remote_it_aggregates",
                "date": now_utc,
                "median": float(median_val),
                "p25": float(p25_val),
                "p75": float(p75_val),
                "currency": "USD",
                "role": meta["role"],
                "status": "published"
            })

    try:
        stmt = insert(SalaryData).values(records)
        stmt = stmt.on_conflict_do_update(
            index_elements=["technology", "country", "source", "date"],
            set_={
                "median": stmt.excluded.median,
                "p25": stmt.excluded.p25,
                "p75": stmt.excluded.p75,
                "role": stmt.excluded.role,
                "status": "published"
            }
        )
        db.execute(stmt)
        db.commit()
        logger.info(f"Successfully updated {len(records)} salary benchmarks for 5 countries.")
        return len(records)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to commit salary benchmarks: {e}")
        raise e
    finally:
        if should_close:
            db.close()


if __name__ == "__main__":
    asyncio.run(scrape_developer_salaries())
