from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

from database.session import get_db
from database.models import SystemLog, SourceLog, DataSource
from api.schemas import SystemLogSchema, SourceLogSchema

router = APIRouter()

@router.get("/logs", response_model=List[SystemLogSchema])
def get_system_logs(
    level: Optional[str] = Query(None, description="Filter by log level (INFO, WARNING, ERROR)"),
    component: Optional[str] = Query(None, description="Filter by component (e.g., NewsAgent, FastAPI)"),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(SystemLog)
    if level:
        query = query.filter(SystemLog.level == level.upper())
    if component:
        query = query.filter(SystemLog.component == component)
        
    return query.order_by(SystemLog.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/components", response_model=List[str])
def get_log_components(db: Session = Depends(get_db)):
    """Returns a list of distinct components present in SystemLog."""
    components = db.query(SystemLog.component).distinct().filter(SystemLog.component.isnot(None)).all()
    comp_list = sorted(list(set(c[0] for c in components if c[0])))
    default_components = [
        "FastAPI", "Orchestrator", "Orchestrator-Social", "Orchestrator-Tech",
        "Orchestrator-Jobs", "Orchestrator-Synthesis", "Scheduler", "Synthesizer",
        "SocialScraper", "TechScraper", "JobsScraper", "SalaryScraper", "NewsAgent"
    ]
    return sorted(list(set(comp_list + default_components)))

@router.get("/source-logs", response_model=List[SourceLogSchema])
def get_source_logs(
    data_source_id: Optional[int] = Query(None),
    status_code: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get source error and telemetry logs with channel names, URLs, and HTTP statuses."""
    query = db.query(
        SourceLog,
        DataSource.name.label("source_name"),
        DataSource.url.label("source_url"),
        DataSource.category.label("source_category")
    ).outerjoin(DataSource, SourceLog.data_source_id == DataSource.id)

    if data_source_id:
        query = query.filter(SourceLog.data_source_id == data_source_id)
    if status_code:
        query = query.filter(SourceLog.http_status == status_code)

    results = query.order_by(SourceLog.created_at.desc()).offset(offset).limit(limit).all()

    logs = []
    for log, s_name, s_url, s_cat in results:
        logs.append({
            "id": log.id,
            "data_source_id": log.data_source_id,
            "source_name": s_name or f"Source #{log.data_source_id}",
            "source_url": s_url or "",
            "source_category": s_cat or "unknown",
            "error_message": log.error_message,
            "http_status": log.http_status,
            "created_at": log.created_at
        })
    return logs

@router.get("/sources/telemetry")
def get_sources_telemetry(db: Session = Depends(get_db)):
    """
    Returns channel telemetry: operational health, recent errors, and rate limits (403/timeout).
    """
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)

    sources = db.query(DataSource).all()
    total_count = len(sources)
    active_count = sum(1 for s in sources if s.is_active == 1)

    # Get recent error logs from last 24h
    recent_errors = db.query(SourceLog).filter(SourceLog.created_at >= since_24h).all()
    error_by_source: Dict[int, List[SourceLog]] = {}
    for err in recent_errors:
        error_by_source.setdefault(err.data_source_id, []).append(err)

    # Compile telemetry per source
    sources_data = []
    healthy_count = 0
    blocked_count = 0
    failing_count = 0

    for s in sources:
        s_errs = error_by_source.get(s.id, [])
        last_err = s_errs[0] if s_errs else None
        
        status = "healthy"
        if last_err:
            if last_err.http_status == 403 or "403" in (last_err.error_message or ""):
                status = "blocked_403"
                blocked_count += 1
            else:
                status = "error"
                failing_count += 1
        else:
            healthy_count += 1

        sources_data.append({
            "id": s.id,
            "name": s.name,
            "url": s.url,
            "category": s.category,
            "source_type": s.source_type,
            "is_active": s.is_active,
            "status": status,
            "last_http_status": last_err.http_status if last_err else None,
            "last_error": last_err.error_message if last_err else None,
            "last_error_at": last_err.created_at if last_err else None,
            "errors_24h": len(s_errs)
        })

    return {
        "total_sources": total_count,
        "active_sources": active_count,
        "healthy_sources": healthy_count,
        "blocked_403_sources": blocked_count,
        "failing_sources": failing_count,
        "recent_errors_24h": len(recent_errors),
        "sources": sources_data
    }


@router.get("/sources/telemetry/history")
def get_sources_telemetry_history(
    hours: int = Query(24, ge=1, le=168, description="History window in hours (1-168)"),
    db: Session = Depends(get_db)
):
    """
    Returns hourly error buckets for the requested time window.
    Used to power the telemetry bar/area chart in the Admin UI.
    Response: list of { hour: ISO string, total_errors, blocked_403, other_errors, sources_affected }
    """
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=hours)

    rows = db.query(SourceLog).filter(SourceLog.created_at >= since).all()

    # Build hourly buckets
    buckets: Dict[str, Dict[str, Any]] = {}
    for h in range(hours):
        bucket_time = now - timedelta(hours=hours - h - 1)
        key = bucket_time.strftime("%Y-%m-%dT%H:00:00Z")
        buckets[key] = {
            "hour": key,
            "label": bucket_time.strftime("%H:%M"),
            "total_errors": 0,
            "blocked_403": 0,
            "other_errors": 0,
            "sources_affected": set(),
        }

    for log in rows:
        if log.created_at is None:
            continue
        log_dt = log.created_at
        if log_dt.tzinfo is None:
            log_dt = log_dt.replace(tzinfo=timezone.utc)
        key = log_dt.strftime("%Y-%m-%dT%H:00:00Z")
        if key not in buckets:
            continue
        b = buckets[key]
        b["total_errors"] += 1
        if log.http_status == 403 or "403" in (log.error_message or ""):
            b["blocked_403"] += 1
        else:
            b["other_errors"] += 1
        if log.data_source_id:
            b["sources_affected"].add(log.data_source_id)

    result = []
    for key in sorted(buckets.keys()):
        b = buckets[key]
        result.append({
            "hour": b["hour"],
            "label": b["label"],
            "total_errors": b["total_errors"],
            "blocked_403": b["blocked_403"],
            "other_errors": b["other_errors"],
            "sources_affected": len(b["sources_affected"]),
        })

    return {"history": result, "window_hours": hours}

