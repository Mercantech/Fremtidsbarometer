from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from database.session import get_db
from database.models import JobPosting
from api.services.job_scoring import enrich_job_posting
from api.schemas import JobBulkDeleteRequest, JobCleanupExpiredRequest
from api.services.audit_logger import log_admin_action

router = APIRouter()

DANISH_REGIONS = ["Viborg", "Aarhus", "København", "Copenhagen", "Silkeborg", "Aalborg", "Odense", "Herning", "Randers"]


@router.get("/jobs")
def list_admin_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    only_danish: bool = Query(False),
    only_hot: bool = Query(False),
    only_salary: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Returns a paginated list of scraped job postings with Danish filters and salary details.
    """
    query = db.query(JobPosting).filter(JobPosting.status != "archived")

    if only_danish:
        query = query.filter(
            or_(
                JobPosting.country == "DK",
                JobPosting.city.in_(DANISH_REGIONS),
                *[JobPosting.city.ilike(f"%{r}%") for r in DANISH_REGIONS]
            )
        )
    elif country:
        query = query.filter(JobPosting.country == country.upper())

    if city:
        query = query.filter(JobPosting.city.ilike(f"%{city}%"))

    if only_salary:
        query = query.filter(JobPosting.salary_min.isnot(None))

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                JobPosting.title.ilike(s),
                JobPosting.company.ilike(s),
                JobPosting.technology.ilike(s),
                JobPosting.city.ilike(s),
            )
        )

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit

    raw_jobs = query.order_by(desc(JobPosting.created_at)).offset(offset).limit(limit).all()

    items = []
    for j in raw_jobs:
        enrich_job_posting(j)
        if only_hot and not j.is_hot:
            continue
        items.append({
            "id": j.id,
            "title": j.title,
            "company": j.company or "Unknown",
            "url": j.url,
            "source": j.source,
            "country": j.country or "GLOBAL",
            "city": j.city or "Remote",
            "technology": j.technology,
            "tags": j.tags or [],
            "salary_min": j.salary_min,
            "salary_max": j.salary_max,
            "salary_currency": j.salary_currency or "USD",
            "hype_score": getattr(j, "hype_score", 0.0),
            "is_hot": getattr(j, "is_hot", False),
            "created_at": j.created_at.isoformat() if j.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@router.get("/jobs/stats")
def get_jobs_statistics(db: Session = Depends(get_db)):
    """
    Returns aggregated labor market statistics and Danish regional breakdown.
    """
    total = db.query(JobPosting).filter(JobPosting.status != "archived").count()

    danish_count = db.query(JobPosting).filter(
        JobPosting.status != "archived",
        or_(
            JobPosting.country == "DK",
            JobPosting.city.in_(DANISH_REGIONS),
            *[JobPosting.city.ilike(f"%{r}%") for r in DANISH_REGIONS]
        )
    ).count()

    salary_count = db.query(JobPosting).filter(
        JobPosting.status != "archived",
        JobPosting.salary_min.isnot(None)
    ).count()

    # City breakdown
    cities_query = (
        db.query(JobPosting.city, func.count(JobPosting.id).label("cnt"))
        .filter(JobPosting.status != "archived", JobPosting.city.isnot(None), JobPosting.city != "")
        .group_by(JobPosting.city)
        .order_by(desc("cnt"))
        .limit(8)
        .all()
    )

    return {
        "total_jobs": total,
        "danish_jobs": danish_count,
        "salary_disclosed_count": salary_count,
        "danish_focus_regions": DANISH_REGIONS,
        "top_cities": [{"city": c[0], "count": c[1]} for c in cities_query],
    }


@router.delete("/jobs/{job_id}", status_code=status.HTTP_200_OK)
def delete_admin_job(job_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Deletes or archives an unwanted/spam job posting.
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    title = job.title
    company = job.company
    db.delete(job)
    log_admin_action(
        db,
        action="JOB_DELETE",
        entity_type="job",
        entity_id=str(job_id),
        details={"title": title, "company": company},
        request=request,
    )
    db.commit()
    return {"status": "deleted", "id": job_id, "title": title, "company": company}


@router.get("/jobs/expired-count")
def get_expired_jobs_count(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Returns exact count of job postings published or created more than `days` ago.
    Zero fiction: checks database timestamps directly.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    count = db.query(JobPosting).filter(
        func.coalesce(JobPosting.date, JobPosting.created_at) < cutoff
    ).count()
    return {
        "days": days,
        "cutoff_date": cutoff.isoformat(),
        "expired_count": count
    }


@router.post("/jobs/cleanup-expired")
def cleanup_expired_jobs(
    payload: JobCleanupExpiredRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Deletes job postings older than specified days with verified count return.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=payload.days)
    expired_q = db.query(JobPosting).filter(
        func.coalesce(JobPosting.date, JobPosting.created_at) < cutoff
    )
    count = expired_q.count()
    expired_q.delete(synchronize_session=False)
    log_admin_action(
        db,
        action="JOB_CLEANUP_EXPIRED",
        entity_type="job",
        details={"deleted_count": count, "days": payload.days, "cutoff_date": cutoff.isoformat()},
        request=request,
    )
    db.commit()
    return {
        "status": "cleaned",
        "deleted_count": count,
        "days": payload.days,
        "cutoff_date": cutoff.isoformat()
    }


@router.post("/jobs/bulk-delete")
def bulk_delete_jobs(
    payload: JobBulkDeleteRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Bulk deletes a list of jobs by IDs.
    """
    if not payload.job_ids:
        return {"status": "noop", "deleted_count": 0, "deleted_ids": []}

    deleted_count = db.query(JobPosting).filter(
        JobPosting.id.in_(payload.job_ids)
    ).delete(synchronize_session=False)
    log_admin_action(
        db,
        action="JOB_BULK_DELETE",
        entity_type="job",
        details={
            "deleted_count": deleted_count,
            "requested_count": len(payload.job_ids),
            "job_ids": payload.job_ids[:50],
        },
        request=request,
    )
    db.commit()

    return {
        "status": "bulk_deleted",
        "deleted_count": deleted_count,
        "requested_count": len(payload.job_ids)
    }


