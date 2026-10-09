from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.models import JobPosting
from database.session import get_db
from api.schemas import JobPostingSchema

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

from utils.logger import get_centralized_logger

logger = get_centralized_logger("JobsRoute")

@router.get("", response_model=List[JobPostingSchema], include_in_schema=False)
@router.get("/", response_model=List[JobPostingSchema])
def get_jobs(
    country: Optional[str] = Query(None, description="Country filter (e.g. DK, EU). If empty, returns all."),
    technology: Optional[str] = Query(None, description="Technology filter (e.g. Python)"),
    limit: int = Query(20, description="Number of jobs to return"),
    db: Session = Depends(get_db)
):
    """
    Returns the latest jobs with self-healing schema repair and graceful degradation.
    """
    try:
        query = db.query(JobPosting).filter(JobPosting.status == 'published')
        if country:
            query = query.filter(JobPosting.country == country)
        if technology:
            query = query.filter(JobPosting.technology.ilike(f"%{technology}%"))
        results = query.order_by(JobPosting.date.desc()).limit(limit).all()
        return results
    except Exception as e:
        logger.warning(f"Error executing get_jobs query: {e}")
        err_msg = str(e).lower()
        # Auto-heal: If schema columns are missing in un-migrated DB, apply DDL and retry
        if "salary_min" in err_msg or "undefinedcolumn" in err_msg or "does not exist" in err_msg:
            try:
                db.rollback()
                from sqlalchemy import text
                db.execute(text("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_min DOUBLE PRECISION;"))
                db.execute(text("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_max DOUBLE PRECISION;"))
                db.execute(text("ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10);"))
                db.execute(text("CREATE INDEX IF NOT EXISTS idx_job_salary ON job_postings (salary_min, salary_max);"))
                db.commit()
                logger.info("Auto-healed job_postings schema. Retrying get_jobs query...")
                
                retry_query = db.query(JobPosting).filter(JobPosting.status == 'published')
                if country:
                    retry_query = retry_query.filter(JobPosting.country == country)
                if technology:
                    retry_query = retry_query.filter(JobPosting.technology.ilike(f"%{technology}%"))
                return retry_query.order_by(JobPosting.date.desc()).limit(limit).all()
            except Exception as heal_err:
                logger.error(f"Auto-heal schema failed: {heal_err}")
                db.rollback()

        # Graceful degradation: never crash server with 500, return empty list
        return []

