import asyncio
import logging
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.session import get_db, get_session
from database.models import RawScrapeData, SystemLog, SourceLog, PipelineExecution
from agents.scheduler import get_scheduler, create_configured_scheduler

router = APIRouter()
logger = logging.getLogger("AdminPipeline")

# Global pipeline concurrency lock to prevent overlapping runs and race conditions
pipeline_lock = asyncio.Lock()

SCHEDULED_JOBS_METADATA = {
    "live_news_feed_job": {
        "name": "Live Real-Time IT News Feed",
        "description": "Scrapes and synthesizes live news every 15 minutes from RSS feeds & Google News.",
        "category": "news",
        "default_schedule": "Every 15 minutes",
    },
    "social_sweep_job": {
        "name": "Partition 1: Social Discussions Sweep",
        "description": "Collects developer sentiment and topics from Dev.to, Reddit, and Lobste.rs.",
        "category": "sweep",
        "default_schedule": "Mon & Thu at 09:00 UTC",
    },
    "tech_sweep_job": {
        "name": "Partition 2: Technical Trends Sweep",
        "description": "Collects GitHub trending repositories and HackerNews technology threads.",
        "category": "sweep",
        "default_schedule": "Mon & Thu at 10:00 UTC",
    },
    "jobs_sweep_job": {
        "name": "Partition 3: ATS Tech Jobs Sweep",
        "description": "Scrapes live tech job listings from Teamtailor and Nordic ATS systems.",
        "category": "sweep",
        "default_schedule": "Mon & Thu at 11:00 UTC",
    },
    "synthesis_job": {
        "name": "Partition 4: AI Mathematical Synthesis",
        "description": "Runs Gemini clustering, hype scoring, and historical trend calculations.",
        "category": "sweep",
        "default_schedule": "Mon & Thu at 12:00 UTC",
    },
    "salary_sweep_job": {
        "name": "Developer Salary Benchmark Sweep",
        "description": "Updates developer salary compensation rates across European and US markets.",
        "category": "salary",
        "default_schedule": "Sundays at 02:00 UTC",
    },
    "db_cleanup_job": {
        "name": "PostgreSQL Retention Cleanup",
        "description": "Purges raw discussion dumps older than 14 days and logs older than 30 days.",
        "category": "maintenance",
        "default_schedule": "Daily at 03:00 UTC",
    },
}


def _get_active_scheduler():
    sched = get_scheduler()
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if sched is None or not getattr(sched, "running", False):
        sched = create_configured_scheduler(loop=loop)
    elif loop is not None and (getattr(sched, "_eventloop", None) is None or getattr(sched._eventloop, "is_closed", lambda: False)()):
        sched._eventloop = loop

    return sched


def _format_trigger(trigger) -> str:
    if not trigger:
        return "Manual"
    t_str = str(trigger)
    if "interval" in t_str:
        # e.g. interval[0:15:00]
        if "0:15:00" in t_str:
            return "Every 15 minutes"
        if "0:30:00" in t_str:
            return "Every 30 minutes"
        if "0:05:00" in t_str:
            return "Every 5 minutes"
        if "1:00:00" in t_str:
            return "Every 1 hour"
        return t_str
    elif "cron" in t_str:
        if "mon,thu" in t_str:
            if "hour='9'" in t_str:
                return "Mon & Thu at 09:00 UTC"
            if "hour='10'" in t_str:
                return "Mon & Thu at 10:00 UTC"
            if "hour='11'" in t_str:
                return "Mon & Thu at 11:00 UTC"
            if "hour='12'" in t_str:
                return "Mon & Thu at 12:00 UTC"
        if "day_of_week='sun'" in t_str:
            return "Sundays at 02:00 UTC"
        if "hour='3'" in t_str:
            return "Daily at 03:00 UTC"
        return t_str
    return t_str


def _update_step_in_db(run_id: str, step_msg: str):
    db = get_session()
    try:
        rec = db.query(PipelineExecution).filter(PipelineExecution.id == run_id).first()
        if rec:
            rec.current_step = step_msg
            db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to update step for {run_id}: {e}")
    finally:
        db.close()


def _mark_done_in_db(run_id: str, status_val: str, duration: float, error_val: Optional[str] = None):
    db = get_session()
    try:
        rec = db.query(PipelineExecution).filter(PipelineExecution.id == run_id).first()
        if rec:
            rec.status = status_val
            rec.duration_sec = duration
            rec.finished_at = datetime.now(timezone.utc)
            if error_val:
                rec.error_message = error_val
            if status_val == "completed":
                rec.current_step = "Completed successfully"
            elif status_val == "failed":
                rec.current_step = f"Failed: {error_val[:120] if error_val else 'Unknown error'}"
            db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to mark done for {run_id}: {e}")
    finally:
        db.close()


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
    Aborts an active or stuck execution and clears concurrency locks.
    """
    rec = db.query(PipelineExecution).filter(PipelineExecution.id == execution_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Execution record not found")

    now = datetime.now(timezone.utc)
    rec.status = "aborted"
    rec.current_step = "Manually aborted by Admin"
    rec.finished_at = now
    if rec.started_at:
        rec.duration_sec = round((now - rec.started_at).total_seconds(), 1)
    db.commit()

    return {
        "status": "aborted",
        "id": execution_id,
        "message": f"Execution {execution_id} was successfully marked as aborted."
    }


# ── 3. Manual Pipeline Trigger ─────────────────────────────────────
@router.post("/trigger-pipeline")
async def trigger_pipeline(
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Set to true to force scraping and AI synthesis even if data is fresh"),
    sweep: Optional[str] = Query("all", description="Sweep type: 'all', 'social', 'tech', 'jobs', 'salary', 'synthesis', 'news'"),
    db: Session = Depends(get_db)
):
    """
    Manual trigger for scraping and AI processing.
    Records PipelineExecution in PostgreSQL so status persists across page reloads.
    """
    if pipeline_lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pipeline task is already actively running. Please wait for it to finish."
        )

    # Check if there is an active running record in DB
    existing_running = db.query(PipelineExecution).filter(PipelineExecution.status == "running").first()
    if existing_running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Task '{existing_running.sweep}' ({existing_running.id}) is currently running in background."
        )

    run_id = f"pipe-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    now_utc = datetime.now(timezone.utc)
    new_exec = PipelineExecution(
        id=run_id,
        sweep=sweep,
        trigger_type="manual",
        status="running",
        current_step=f"Initializing sweep: {sweep}",
        force=1 if force else 0,
        started_at=now_utc,
    )
    db.add(new_exec)
    db.commit()

    from agents.orchestrator import (
        run_full_cycle,
        run_social_sweep,
        run_tech_sweep,
        run_jobs_sweep,
        run_salary_sweep,
        run_synthesis,
    )
    from agents.news_agent import NewsAgent

    async def _execute_pipeline():
        async with pipeline_lock:
            start_t = datetime.now(timezone.utc)
            try:
                if sweep == "all":
                    _update_step_in_db(run_id, "Partition 1: Social Discussions (Dev.to, Reddit, Lobste.rs)")
                    await run_social_sweep()
                    _update_step_in_db(run_id, "Partition 2: Technical Trends (HackerNews, GitHub Trending)")
                    await run_tech_sweep()
                    _update_step_in_db(run_id, "Partition 3: ATS Tech Jobs (Teamtailor & Nordic ATS)")
                    await run_jobs_sweep()
                    _update_step_in_db(run_id, "Partition 4: AI Mathematical Synthesis (Clustering & Eras)")
                    await run_synthesis()
                elif sweep == "social":
                    _update_step_in_db(run_id, "Harvesting Social Discussions (Dev.to, Reddit, Lobste.rs)")
                    await run_social_sweep()
                elif sweep == "tech":
                    _update_step_in_db(run_id, "Harvesting Tech Trends (HackerNews, GitHub)")
                    await run_tech_sweep()
                elif sweep == "jobs":
                    _update_step_in_db(run_id, "Harvesting ATS Tech Job Postings")
                    await run_jobs_sweep()
                elif sweep == "salary":
                    _update_step_in_db(run_id, "Harvesting Developer Salary Benchmarks")
                    await run_salary_sweep()
                elif sweep == "synthesis":
                    _update_step_in_db(run_id, "Running AI Mathematical Synthesis & Trend Clustering")
                    await run_synthesis()
                elif sweep == "news":
                    _update_step_in_db(run_id, "Fetching Live Real-Time News (RSS feeds)")
                    await NewsAgent().fetch_news()

                end_t = datetime.now(timezone.utc)
                dur = round((end_t - start_t).total_seconds(), 1)
                _mark_done_in_db(run_id, "completed", dur)
            except Exception as e:
                err_tb = traceback.format_exc()
                end_t = datetime.now(timezone.utc)
                dur = round((end_t - start_t).total_seconds(), 1)
                logger.error(f"Pipeline run '{run_id}' failed: {e}\n{err_tb}")
                _mark_done_in_db(run_id, "failed", dur, error_val=str(e))

                db_s = get_session()
                try:
                    db_s.add(SystemLog(
                        level="ERROR",
                        component=f"AdminPipeline-{sweep}",
                        message=f"Pipeline task error ({run_id}): {str(e)}",
                        traceback=err_tb
                    ))
                    db_s.commit()
                except Exception:
                    db_s.rollback()
                finally:
                    db_s.close()

    background_tasks.add_task(_execute_pipeline)

    return {
        "status": "dispatched",
        "id": run_id,
        "sweep": sweep,
        "force": force,
        "message": f"Pipeline task '{sweep}' ({run_id}) dispatched and running in background."
    }


# ── 4. Scheduler Management ────────────────────────────────────────
@router.get("/scheduler/jobs")
async def get_scheduled_jobs():
    """
    Returns list of all automated recurring pipeline jobs, their next execution times,
    schedules, and paused/active statuses.
    """
    sched = _get_active_scheduler()
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
            "schedule_display": _format_trigger(job.trigger),
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
    sched = _get_active_scheduler()
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
    sched = _get_active_scheduler()
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

    sched = _get_active_scheduler()
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Manually triggers immediate execution of a scheduled job.
    """
    sched = _get_active_scheduler()
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

    return await trigger_pipeline(background_tasks=background_tasks, force=True, sweep=sweep_type, db=db)


@router.post("/scheduler/toggle")
async def toggle_scheduler():
    """
    Toggles the entire background scheduler (starts if stopped, pauses/resumes if running).
    """
    sched = _get_active_scheduler()
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
