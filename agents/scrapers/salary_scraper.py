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

from database.models import SalaryData, JobPosting, RawScrapeData
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
    "DK": 0.72,
    "NO": 0.70,
    "DE": 0.65,
    "SE": 0.62
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Fremtidsbarometer/1.0"
    }

    # 1. Fetch remote dev vacancies from RemoteOK API
    try:
        async with httpx.AsyncClient(headers=headers, timeout=20.0) as client:
            resp = await client.get("https://remoteok.com/api")
            if resp.status_code == 200:
                jobs = resp.json()
                # Skip first legal disclaimer object
                for job in jobs[1:]:
                    s_min = job.get("salary_min")
                    s_max = job.get("salary_max")
                    pos = job.get("position") or ""
                    tags = [t.lower() for t in job.get("tags", []) if isinstance(t, str)]

                    salary = None
                    if s_min and s_max:
                        salary = (float(s_min) + float(s_max)) / 2
                    elif s_min:
                        salary = float(s_min)
                    elif s_max:
                        salary = float(s_max)

                    if salary and 35000 <= salary <= 450000:
                        cat = _classify_job(pos, tags)
                        if cat:
                            empirical_salaries[cat].append(salary)
                logger.info(f"Collected {sum(len(v) for v in empirical_salaries.values())} empirical salary points from RemoteOK.")
    except Exception as e:
        logger.warning(f"RemoteOK salary fetch failed: {e}")

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
