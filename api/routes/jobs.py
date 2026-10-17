from datetime import datetime, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.models import JobPosting
from database.session import get_db
from api.schemas import JobPostingSchema
from api.services.job_scoring import enrich_job_posting, get_live_trending_keywords
from agents.scrapers.geo_data import LOCATION_PATTERNS, COMPANY_DEFAULT_LOCATIONS
import re

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

from utils.logger import get_centralized_logger

logger = get_centralized_logger("JobsRoute")

# ── Country priority weighting ─────────────────────────────
# The service is Danish-first: DK jobs must dominate the radar even when a
# single big sweep (DE/UA/SE) floods the latest-N window with foreign batches.
DK_QUOTA_SHARE = 0.55          # 55% of the response budget reserved for DK
ISO2_PATTERN = re.compile(r"^[A-Z]{2}$")


def _normalize_remote_country(country: Optional[str], city: Optional[str], company: Optional[str]) -> str:
    """
    Normalizes pseudo-country codes written by AI extraction ('REMOTE', 'EUROPE', ...).
    Priority: deduce real country from city -> company HQ mapping -> GLOBAL.
    """
    c = (country or "").strip().upper()
    if ISO2_PATTERN.match(c) and c != "RE":
        return c
    # Deduce from city name (e.g. city='Kyiv' but country='REMOTE')
    if city:
        city_text = city.strip().lower()
        for pattern, loc in LOCATION_PATTERNS:
            if re.search(pattern, city_text):
                return loc[0]
    # Deduce from company headquarters (e.g. Danish remote jobs)
    if company:
        slug = re.sub(r"[^a-z0-9]", "", company.lower())[:50]
        if slug in COMPANY_DEFAULT_LOCATIONS:
            return COMPANY_DEFAULT_LOCATIONS[slug][0]
    return "GLOBAL"

@router.get("", response_model=List[JobPostingSchema], include_in_schema=False)
@router.get("/", response_model=List[JobPostingSchema])
def get_jobs(
    country: Optional[str] = Query(None, description="Country filter (e.g. DK, EU). If empty, returns all."),
    technology: Optional[str] = Query(None, description="Technology filter (e.g. Python)"),
    limit: int = Query(20, description="Number of jobs to return"),
    sort_by_hype: bool = Query(False, description="Sort results by hype_score descending"),
    only_hot: bool = Query(False, description="Filter only hot vacancies (hype_score >= 0.50)"),
    db: Session = Depends(get_db)
):
    """
    Returns latest or hype-scored jobs with graceful degradation.
    """
    try:
        query = db.query(JobPosting).filter(JobPosting.status == 'published')
        if country:
            query = query.filter(JobPosting.country == country)
        if technology:
            query = query.filter(JobPosting.technology.ilike(f"%{technology}%"))

        db_limit = limit if not (sort_by_hype or only_hot) else min(max(limit * 3, 100), 500)
        # Deep enough window so that smaller national batches (e.g. DK) survive
        # even right after high-volume multi-country scrape sweeps (DE/UA/SE).
        if not (sort_by_hype or only_hot):
            db_limit = min(max(limit * 3, 900), 2000)
        db_results = query.order_by(JobPosting.date.desc()).limit(db_limit).all()

        now = datetime.now(timezone.utc)
        trends = get_live_trending_keywords(db)
        scored_jobs = [enrich_job_posting(job, now=now, custom_trending_keywords=trends) for job in db_results]
        # Heal legacy/AI-generated pseudo-countries ('REMOTE', 'EUROPE', ...) at read time
        for job in scored_jobs:
            job.country = _normalize_remote_country(job.country, job.city, job.company)

        if only_hot:
            scored_jobs = [j for j in scored_jobs if getattr(j, "is_hot", False)]

        if sort_by_hype:
            scored_jobs.sort(
                key=lambda j: (
                    getattr(j, "hype_score", 0.0) or 0.0,
                    getattr(j, "date", None) or datetime.min.replace(tzinfo=timezone.utc)
                ),
                reverse=True
            )
            return scored_jobs[:limit]

        # Fair country interleave: when no explicit country filter is requested,
        # round-robin across countries so a single high-volume scrape sweep
        # (e.g. DE/UA) cannot push smaller national batches (e.g. DK) out of
        # the latest-N window and blank them on the radar/globe meta-country.
        if not country and not only_hot:
            scored_jobs.sort(
                key=lambda j: getattr(j, "date", None) or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True
            )
            buckets: defaultdict[str, List] = defaultdict(list)
            for job in scored_jobs:
                buckets[(job.country or "EU").upper()].append(job)

            dk_bucket = buckets.pop("DK", [])
            other_order = sorted(
                buckets.keys(),
                key=lambda c: buckets[c][0].date or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True
            )

            # Danish-first budget: DK reserves its quota share upfront,
            # the remainder round-robins fairly across all other countries.
            interleaved: List = []
            dk_quota = min(len(dk_bucket), round(limit * DK_QUOTA_SHARE))
            interleaved.extend(dk_bucket[:dk_quota])
            remaining_budget = limit - len(interleaved)

            if other_order:
                others_cap = max(remaining_budget // max(len(other_order), 1) + 1, 25)
                level = 0
                while len(interleaved) < limit:
                    level_has_items = False
                    for c in other_order:
                        bucket = buckets[c]
                        if level < len(bucket) and level < others_cap:
                            interleaved.append(bucket[level])
                            level_has_items = True
                            if len(interleaved) >= limit:
                                break
                    if not level_has_items:
                        break
                    level += 1

            # Unused DK quota flows back to other countries automatically
            scored_jobs = interleaved

        return scored_jobs[:limit]
    except Exception as e:
        logger.error(f"Error executing get_jobs query: {e}")
        db.rollback()
        # Graceful degradation: return empty list on query failure without crashing or blocking
        return []


