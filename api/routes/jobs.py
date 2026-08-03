from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.models import JobPosting
from api.database import get_db
from api.schemas import JobPostingSchema

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

@router.get("/", response_model=List[JobPostingSchema])
def get_jobs(
    country: Optional[str] = Query(None, description="Country filter (e.g. DK, EU). If empty, returns all."),
    technology: Optional[str] = Query(None, description="Technology filter (e.g. Python)"),
    limit: int = Query(20, description="Number of jobs to return"),
    db: Session = Depends(get_db)
):
    """
    Returns the latest jobs.
    """
    query = db.query(JobPosting)
    
    if country:
        query = query.filter(JobPosting.country == country)

    if technology:
        query = query.filter(JobPosting.technology.ilike(f"%{technology}%"))

    results = query.order_by(JobPosting.date.desc()).limit(limit).all()
    return results

