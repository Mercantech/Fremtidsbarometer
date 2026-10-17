import asyncio
import logging
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.session import get_db, get_session
from database.models import RawScrapeData, SystemLog, SourceLog, PipelineExecution
from agents.scheduler import get_scheduler, create_configured_scheduler
from utils.pause_flag import set_pipeline_paused

router = APIRouter()
logger = logging.getLogger("AdminPipeline")

from api.services.pipeline_service import (
    pipeline_lock,
    SCHEDULED_JOBS_METADATA,
    get_active_scheduler,
    format_trigger,
    abort_execution,
    dispatch_manual_pipeline,
)


# ── 1. Pipeline Status & Data Freshness ─────────────────────────────
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

    # Check for active execution in DB
    active_rec = db.query(PipelineExecution).filter(PipelineExecution.status == "running").order_by(desc(PipelineExecution.started_at)).first()

    return {
        "status": "ok",
        "freshness": freshness,
        "is_running": pipeline_lock.locked() or (active_rec is not None)
    }


# ── 2. Execution History & Active Process Persistence ───────────────
@router.get("/executions")
def get_pipeline_executions(
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Returns active running pipeline task and historical execution runs.
    Persists across browser page reloads.
    """
    now = datetime.now(timezone.utc)

    # Auto-expire stale runs stuck in running state for > 45 minutes
    stale_cutoff = now - timedelta(minutes=45)
    stale_runs = db.query(PipelineExecution).filter(
        PipelineExecution.status == "running",
        PipelineExecution.started_at < stale_cutoff
    ).all()
    for sr in stale_runs:
        sr.status = "aborted"
        sr.current_step = "Timed out (exceeded 45m limit)"
        sr.finished_at = now
        sr.duration_sec = round((now - sr.started_at).total_seconds(), 1)
    if stale_runs:
        db.commit()

    # Active execution
    active_rec = db.query(PipelineExecution).filter(PipelineExecution.status == "running").order_by(desc(PipelineExecution.started_at)).first()
    active_data = None
    if active_rec:
        elapsed = round((now - active_rec.started_at).total_seconds(), 1) if active_rec.started_at else 0
        active_data = {
            "id": active_rec.id,
            "sweep": active_rec.sweep,
            "trigger_type": active_rec.trigger_type,
            "status": active_rec.status,
            "current_step": active_rec.current_step,
            "force": bool(active_rec.force),
            "started_at": active_rec.started_at.isoformat() if active_rec.started_at else None,
            "elapsed_seconds": elapsed,
        }

    # Recent history
    recent_recs = db.query(PipelineExecution).order_by(desc(PipelineExecution.created_at)).limit(limit).all()
    recent_data = []
    for r in recent_recs:
        recent_data.append({
            "id": r.id,
            "sweep": r.sweep,
            "trigger_type": r.trigger_type,
            "status": r.status,
            "current_step": r.current_step,
            "force": bool(r.force),
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
            "duration_sec": r.duration_sec,
            "error_message": r.error_message,
        })

    return {
        "active_execution": active_data,
        "recent_executions": recent_data,
        "is_locked": pipeline_lock.locked()
    }


@router.post("/executions/{execution_id}/abort")
def abort_pipeline_execution(
    execution_id: str,
    db: Session = Depends(get_db)
):
    """
    Aborts an active or stuck execution by cancelling the asyncio.Task and clearing locks.
    This ensures the background task stops gracefully and pipeline_lock is freed.
    """
    res = abort_execution(execution_id, db)
    if not res.get("found"):
        raise HTTPException(status_code=404, detail="Execution record not found")

    return {
        "status": "aborted",
        "id": execution_id,
        "message": f"Execution {execution_id} was successfully aborted and task cancelled."
    }


# ── 3. Manual Pipeline Trigger ─────────────────────────────────────
@router.post("/trigger-pipeline")
async def trigger_pipeline(
    force: bool = Query(False, description="Set to true to force scraping and AI synthesis even if data is fresh"),
    sweep: Optional[str] = Query("all", description="Sweep type: 'all', 'social', 'tech', 'jobs', 'salary', 'synthesis', 'news'"),
    db: Session = Depends(get_db)
):
    """
    Manual trigger for scraping and AI processing.
    Records PipelineExecution in PostgreSQL so status persists across page reloads.
    Creates an asyncio.Task that can be cancelled via the abort endpoint.
    """
    try:
        return await dispatch_manual_pipeline(sweep=sweep or "all", force=force, db=db)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


# ── 4. Scheduler Management ────────────────────────────────────────
@router.get("/scheduler/jobs")
async def get_scheduled_jobs():
    """
    Returns list of all automated recurring pipeline jobs, their next execution times,
    schedules, and paused/active statuses.
    """
    sched = get_active_scheduler()
    sched_running = getattr(sched, "running", False)

    jobs_list = []
    for job in sched.get_jobs():
        meta = SCHEDULED_JOBS_METADATA.get(job.id, {
            "name": job.name or job.id,
            "description": "Scheduled background pipeline task.",
            "category": "sweep",
            "default_schedule": str(job.trigger)
        })

        next_run = getattr(job, "next_run_time", None)
        is_paused = (next_run is None and sched_running)

        trigger_type = "interval" if "interval" in str(job.trigger) else "cron"
        interval_min = 15
        if trigger_type == "interval":
            try:
                interval_min = int(job.trigger.interval.total_seconds() // 60)
            except Exception:
                pass

        jobs_list.append({
            "id": job.id,
            "name": meta["name"],
            "description": meta["description"],
            "category": meta["category"],
            "schedule_display": format_trigger(job.trigger),
            "next_run_time": next_run.isoformat() if next_run else None,
            "is_paused": is_paused,
            "trigger_type": trigger_type,
            "interval_minutes": interval_min,
        })

    return {
        "scheduler_running": sched_running,
        "jobs": jobs_list,
    }


@router.post("/scheduler/jobs/{job_id}/pause")
async def pause_scheduled_job(job_id: str):
    """
    Pauses a recurring scheduled job.
    """
    sched = get_active_scheduler()
    job = sched.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    job.pause()
    logger.info(f"Paused scheduled job '{job_id}'")
    return {
        "status": "paused",
        "job_id": job_id,
        "message": f"Job '{job_id}' paused successfully."
    }


@router.post("/scheduler/jobs/{job_id}/resume")
async def resume_scheduled_job(job_id: str):
    """
    Resumes a paused recurring scheduled job.
    """
    sched = get_active_scheduler()
    if not getattr(sched, "running", False):
        try:
            loop = asyncio.get_running_loop()
            sched = create_configured_scheduler(loop=loop)
            sched.start()
        except Exception as e:
            logger.error(f"Failed to start scheduler on job resume: {e}")

    job = sched.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    job.resume()
    logger.info(f"Resumed scheduled job '{job_id}'")
    return {
        "status": "resumed",
        "job_id": job_id,
        "next_run_time": job.next_run_time.isoformat() if getattr(job, "next_run_time", None) else None,
        "message": f"Job '{job_id}' resumed successfully."
    }


class UpdateIntervalRequest(BaseModel):
    interval_minutes: int


@router.post("/scheduler/jobs/{job_id}/update-interval")
async def update_scheduled_job_interval(job_id: str, payload: UpdateIntervalRequest):
    """
    Updates the interval frequency (in minutes) for an interval-based job.
    """
    if payload.interval_minutes < 1 or payload.interval_minutes > 1440:
        raise HTTPException(status_code=400, detail="Interval minutes must be between 1 and 1440")

    sched = get_active_scheduler()
    job = sched.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    job.reschedule("interval", minutes=payload.interval_minutes)
    logger.info(f"Rescheduled job '{job_id}' to every {payload.interval_minutes} minutes")

    return {
        "status": "updated",
        "job_id": job_id,
        "interval_minutes": payload.interval_minutes,
        "schedule_display": f"Every {payload.interval_minutes} minutes",
        "next_run_time": job.next_run_time.isoformat() if getattr(job, "next_run_time", None) else None,
    }


@router.post("/scheduler/jobs/{job_id}/run-now")
async def run_scheduled_job_now(
    job_id: str,
    db: Session = Depends(get_db)
):
    """
    Manually triggers immediate execution of a scheduled job.
    """
    sched = get_active_scheduler()
    job = sched.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    # Map job id to sweep type
    sweep_map = {
        "live_news_feed_job": "news",
        "social_sweep_job": "social",
        "tech_sweep_job": "tech",
        "jobs_sweep_job": "jobs",
        "synthesis_job": "synthesis",
        "salary_sweep_job": "salary",
        "db_cleanup_job": "cleanup",
    }
    sweep_type = sweep_map.get(job_id, "all")

    if sweep_type == "cleanup":
        return trigger_db_cleanup(days=14, db=db)

    return await trigger_pipeline(force=True, sweep=sweep_type, db=db)


@router.post("/scheduler/toggle")
async def toggle_scheduler():
    """
    Toggles the entire background scheduler (starts if stopped, pauses/resumes if running).
    """
    sched = get_active_scheduler()
    if not getattr(sched, "running", False):
        try:
            loop = asyncio.get_running_loop()
            sched._eventloop = loop
            sched.start()
            return {"status": "started", "scheduler_running": True, "message": "Scheduler started successfully."}
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to start scheduler: {e}")
    else:
        # Pause or resume jobs
        all_jobs = sched.get_jobs()
        any_paused = any(getattr(j, "next_run_time", None) is None for j in all_jobs)
        if any_paused:
            for j in all_jobs:
                try:
                    j.resume()
                except Exception as e:
                    logger.warning(f"Error resuming job {j.id}: {e}")
            return {"status": "resumed", "scheduler_running": True, "message": "All scheduled jobs resumed."}
        else:
            for j in all_jobs:
                try:
                    j.pause()
                except Exception as e:
                    logger.warning(f"Error pausing job {j.id}: {e}")
            return {"status": "paused", "scheduler_running": False, "message": "All scheduled jobs paused."}


@router.post("/pipeline/pause")
async def admin_pause_pipeline():
    """Admin endpoint to globally pause the pipeline processing."""
    set_pipeline_paused(True)
    logger.info("Pipeline globally paused via admin endpoint")
    return {"status": "paused", "message": "Pipeline paused successfully."}

@router.post("/pipeline/resume")
async def admin_resume_pipeline():
    """Admin endpoint to resume the globally paused pipeline processing."""
    set_pipeline_paused(False)
    logger.info("Pipeline globally resumed via admin endpoint")
    return {"status": "resumed", "message": "Pipeline resumed successfully."}


# ── 5. Retention Cleanup & Seeding ─────────────────────────────────
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


@router.post("/seed-database")
def trigger_seed_database(db: Session = Depends(get_db)):
    """
    Manually triggers database seeding of eras, historical trends, AI models, sources, and salaries.
    Idempotent and safe to execute anytime.
    """
    from database.seeds.eras import seed_eras
    from database.seeds.history import seed_historical_data
    from database.seeds.sources import seed_sources
    from database.seeds.ai_models import seed_ai_models
    from database.seeds.salaries import seed_salary_data
    from database.models import Era, AIModelConfig, DataSource, TechTrend

    try:
        seed_eras(db)
        seed_historical_data(db)
        seed_sources(db)
        seed_ai_models(db)
        seed_salary_data(db)

        return {
            "status": "success",
            "message": "Database successfully populated with default seed data (eras, trends, models, sources).",
            "counts": {
                "eras": db.query(Era).count(),
                "ai_models": db.query(AIModelConfig).count(),
                "data_sources": db.query(DataSource).count(),
                "tech_trends": db.query(TechTrend).count(),
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database seeding failed: {str(e)}"
        )
