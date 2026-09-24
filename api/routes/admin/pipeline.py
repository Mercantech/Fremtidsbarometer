import asyncio
import logging
import traceback
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from api.database import get_db
from database.session import get_session
from database.models import RawScrapeData, SystemLog, SourceLog

router = APIRouter()
logger = logging.getLogger("AdminPipeline")

# Global pipeline concurrency lock to prevent overlapping runs and race conditions
pipeline_lock = asyncio.Lock()

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
        "freshness": freshness,
        "is_running": pipeline_lock.locked()
    }

@router.post("/trigger-pipeline")
async def trigger_pipeline(
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Set to true to force scraping and AI synthesis even if data is fresh"),
    sweep: Optional[str] = Query("all", description="Sweep type: 'all', 'social', 'tech', 'jobs', 'synthesis', 'news'"),
    db: Session = Depends(get_db)
):
    """
    Manual trigger for scraping and AI processing.
    Protected by concurrency lock to avoid database race conditions and duplicate AI calls.
    """
    if pipeline_lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pipeline task is already actively running. Please wait for it to finish."
        )

    from agents.orchestrator import run_full_cycle, run_social_sweep, run_tech_sweep, run_jobs_sweep, run_synthesis
    from agents.news_agent import NewsAgent

    async def _execute_pipeline():
        async with pipeline_lock:
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
                err_tb = traceback.format_exc()
                logger.error(f"Background execution of '{sweep}' failed: {e}\n{err_tb}")
                db_session = get_session()
                try:
                    db_session.add(SystemLog(
                        level="ERROR",
                        component=f"AdminPipeline-{sweep}",
                        message=f"Pipeline task error: {str(e)}",
                        traceback=err_tb
                    ))
                    db_session.commit()
                except Exception:
                    db_session.rollback()
                finally:
                    db_session.close()

    background_tasks.add_task(_execute_pipeline)

    return {
        "status": "dispatched",
        "sweep": sweep,
        "force": force,
        "message": f"Pipeline task '{sweep}' (force={force}) has been queued and started in background."
    }

@router.post("/cleanup")
def trigger_db_cleanup(
    days: int = Query(14, ge=1, le=90, description="Delete raw records older than this number of days"),
    db: Session = Depends(get_db)
):
    """
    Manually triggers database retention cleanup to free up PostgreSQL disk space.
    """
    cutoff_raw = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_logs = datetime.now(timezone.utc) - timedelta(days=30)
    
    deleted_raw = db.query(RawScrapeData).filter(RawScrapeData.created_at < cutoff_raw).delete()
    deleted_sys = db.query(SystemLog).filter(SystemLog.created_at < cutoff_logs).delete()
    deleted_src = db.query(SourceLog).filter(SourceLog.created_at < cutoff_logs).delete()
    db.commit()
    
    return {
        "status": "success",
        "deleted_raw_scrapes": deleted_raw,
        "deleted_system_logs": deleted_sys,
        "deleted_source_logs": deleted_src
    }
