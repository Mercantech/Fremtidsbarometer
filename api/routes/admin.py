from fastapi import APIRouter, Depends, Query, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import secrets
from dotenv import load_dotenv

from api.database import get_db
from database.models import SystemLog
from api.schemas import SystemLogSchema

load_dotenv()

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Admin API key is not configured")
    if not x_api_key or not secrets.compare_digest(x_api_key, admin_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(verify_api_key)])

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
        
    logs = query.order_by(SystemLog.created_at.desc()).offset(offset).limit(limit).all()
    return logs


@router.get("/status")
def get_pipeline_status(
    max_age_hours: int = Query(12, ge=1, le=168, description="Max age in hours for data freshness check"),
    db: Session = Depends(get_db)
):
    """
    Returns data freshness status and recent database statistics for Admin Panel dashboard.
    """
    from agents.orchestrator import check_data_freshness
    freshness = check_data_freshness(db, max_age_hours=max_age_hours)
    return {
        "status": "ok",
        "freshness": freshness
    }


from fastapi import BackgroundTasks

@router.post("/trigger-pipeline")
async def trigger_pipeline(
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Set to true to force scraping and AI synthesis even if data is fresh"),
    sweep: Optional[str] = Query("all", description="Sweep type: 'all', 'social', 'tech', 'jobs', 'synthesis', 'news'"),
    db: Session = Depends(get_db)
):
    """
    Manual 'Пуск' trigger for scraping and AI processing.
    Runs asynchronously in the background so the admin UI receives an immediate response.
    """
    from agents.orchestrator import run_full_cycle, run_social_sweep, run_tech_sweep, run_jobs_sweep, run_synthesis
    from agents.news_agent import NewsAgent

    async def _execute_pipeline():
        try:
            if sweep == "all":
                await run_full_cycle(force=force)
            elif sweep == "social":
                await run_social_sweep()
            elif sweep == "tech":
                await run_tech_sweep()
            elif sweep == "jobs":
                await run_jobs_sweep()
            elif sweep == "synthesis":
                await run_synthesis()
            elif sweep == "news":
                await NewsAgent().fetch_news()
        except Exception as e:
            # Errors are already logged to system_logs by the orchestrator/agents
            pass

    background_tasks.add_task(_execute_pipeline)

    return {
        "status": "dispatched",
        "sweep": sweep,
        "force": force,
        "message": f"Pipeline task '{sweep}' (force={force}) has been queued and started in background."
    }
