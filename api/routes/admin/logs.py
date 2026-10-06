from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.session import get_db
from database.models import SystemLog, SourceLog
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
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get source error logs."""
    query = db.query(SourceLog)
    if data_source_id:
        query = query.filter(SourceLog.data_source_id == data_source_id)
    return query.order_by(SourceLog.created_at.desc()).offset(offset).limit(limit).all()
