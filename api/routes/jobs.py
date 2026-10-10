from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.models import JobPosting
from database.session import get_db
from api.schemas import JobPostingSchema
from api.services.job_scoring import enrich_job_posting, get_live_trending_keywords

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

from utils.logger import get_centralized_logger

logger = get_centralized_logger("JobsRoute")

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
        db_results = query.order_by(JobPosting.date.desc()).limit(db_limit).all()

        now = datetime.now(timezone.utc)
        trends = get_live_trending_keywords(db)
        scored_jobs = [enrich_job_posting(job, now=now, custom_trending_keywords=trends) for job in db_results]

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
    except Exception as e:
        logger.error(f"Error executing get_jobs query: {e}")
        db.rollback()
        # Graceful degradation: return empty list on query failure without crashing or blocking
        return []


