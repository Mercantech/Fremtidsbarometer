"""
Pipeline Service.
Encapsulates background execution orchestration, concurrency locks,
task cancellation, and APScheduler management away from HTTP controllers.
"""

import asyncio
import logging
import traceback
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.session import get_session
from database.models import SystemLog, PipelineExecution, SystemSetting
from agents.scheduler import get_scheduler, create_configured_scheduler

logger = logging.getLogger("PipelineService")

# Global pipeline concurrency lock to prevent overlapping runs and race conditions
pipeline_lock = asyncio.Lock()

# Track active pipeline execution tasks by execution_id for cancellation support
# Maps execution_id (str) → asyncio.Task
_active_pipeline_tasks: Dict[str, asyncio.Task] = {}

SCHEDULED_JOBS_METADATA = {
    "live_news_feed_job": {
        "name": "Live Real-Time IT News Feed",
        "description": "Scrapes and synthesizes live news every 15 minutes from RSS feeds & Google News.",
        "category": "news",
        "default_schedule": "Every 15 minutes",
    },
    "social_sweep_job": {
        "name": "Partition 1: Social Discussions Sweep",
        "description": "Collects developer sentiment and topics from Dev.to and Lobste.rs.",
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


def get_active_scheduler():
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


def format_trigger(trigger) -> str:
    if not trigger:
        return "Manual"
    t_str = str(trigger)
    if "interval" in t_str:
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


def update_step_in_db(run_id: str, step_msg: str):
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


def mark_done_in_db(run_id: str, status_val: str, duration: float, error_val: Optional[str] = None):
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


def abort_execution(execution_id: str, db: Session) -> Dict[str, Any]:
    """
    Aborts an active or stuck execution by cancelling the asyncio.Task and updating DB.
    """
    rec = db.query(PipelineExecution).filter(PipelineExecution.id == execution_id).first()
    if not rec:
        return {"found": False}

    if execution_id in _active_pipeline_tasks:
        task = _active_pipeline_tasks[execution_id]
        if not task.done():
            task.cancel()
            logger.info(f"Cancelled asyncio.Task for execution {execution_id}")

    now = datetime.now(timezone.utc)
    rec.status = "aborted"
    rec.current_step = "Manually aborted by Admin"
    rec.finished_at = now
    if rec.started_at:
        rec.duration_sec = round((now - rec.started_at).total_seconds(), 1)
    db.commit()

    return {"found": True, "id": execution_id}


async def dispatch_manual_pipeline(
    sweep: str,
    force: bool,
    db: Session
) -> Dict[str, Any]:
    """
    Launches a background pipeline task and returns the execution ID.
    Raises RuntimeError if pipeline is currently locked or running.
    """
    if pipeline_lock.locked():
        raise RuntimeError("A pipeline task is already actively running. Please wait for it to finish.")

    existing_running = db.query(PipelineExecution).filter(PipelineExecution.status == "running").first()
    if existing_running:
        raise RuntimeError(f"Task '{existing_running.sweep}' ({existing_running.id}) is currently running in background.")

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
                    update_step_in_db(run_id, "Partition 1: Social Discussions (Dev.to, Lobste.rs)")
                    await run_social_sweep()
                    update_step_in_db(run_id, "Partition 2: Technical Trends (HackerNews, GitHub Trending)")
                    await run_tech_sweep()
                    update_step_in_db(run_id, "Partition 3: ATS Tech Jobs (Teamtailor & Nordic ATS)")
                    await run_jobs_sweep()
                    update_step_in_db(run_id, "Partition 4: AI Mathematical Synthesis (Clustering & Eras)")
                    await run_synthesis(force=force)
                elif sweep == "social":
                    update_step_in_db(run_id, "Harvesting Social Discussions (Dev.to, Lobste.rs)")
                    await run_social_sweep()
                elif sweep == "tech":
                    update_step_in_db(run_id, "Harvesting Tech Trends (HackerNews, GitHub)")
                    await run_tech_sweep()
                elif sweep == "jobs":
                    update_step_in_db(run_id, "Harvesting ATS Tech Job Postings")
                    await run_jobs_sweep()
                elif sweep == "salary":
                    update_step_in_db(run_id, "Harvesting Developer Salary Benchmarks")
                    await run_salary_sweep()
                elif sweep == "synthesis":
                    update_step_in_db(run_id, "Running AI Mathematical Synthesis & Trend Clustering")
                    await run_synthesis(force=force)
                elif sweep == "news":
                    update_step_in_db(run_id, "Fetching Live Real-Time News (RSS feeds)")
                    await NewsAgent().fetch_news()

                end_t = datetime.now(timezone.utc)
                dur = round((end_t - start_t).total_seconds(), 1)
                mark_done_in_db(run_id, "completed", dur)
            except asyncio.CancelledError:
                end_t = datetime.now(timezone.utc)
                dur = round((end_t - start_t).total_seconds(), 1)
                logger.info(f"Pipeline run '{run_id}' was cancelled by user (duration: {dur}s)")
                mark_done_in_db(run_id, "aborted", dur, error_val="Cancelled by admin")
                raise
            except Exception as e:
                err_tb = traceback.format_exc()
                end_t = datetime.now(timezone.utc)
                dur = round((end_t - start_t).total_seconds(), 1)
                logger.error(f"Pipeline run '{run_id}' failed: {e}\n{err_tb}")
                mark_done_in_db(run_id, "failed", dur, error_val=str(e))

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
            finally:
                _active_pipeline_tasks.pop(run_id, None)

    task = asyncio.create_task(_execute_pipeline())
    _active_pipeline_tasks[run_id] = task

    return {
        "status": "dispatched",
        "id": run_id,
        "sweep": sweep,
        "force": force,
        "message": f"Pipeline task '{sweep}' ({run_id}) dispatched and running in background."
    }
