import os
import asyncio
import logging
import uuid
import traceback
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from dotenv import load_dotenv
import pytz
from typing import Optional

# Import orchestrator & news agent
from agents.orchestrator import (
    run_social_sweep,
    run_tech_sweep,
    run_jobs_sweep,
    run_salary_sweep,
    run_synthesis,
    run_full_cycle,
)
from agents.news_agent import NewsAgent
from datetime import datetime, timedelta, timezone
from database.models import SystemLog, RawScrapeData, SourceLog, PipelineExecution
from database.session import get_session

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Scheduler")

load_dotenv()

def cleanup_stale_data():
    """
    Deletes raw scrape dumps older than 14 days and system logs older than 30 days
    to prevent database storage exhaustion.
    """
    db = get_session()
    try:
        cutoff_raw = datetime.now(timezone.utc) - timedelta(days=14)
        cutoff_logs = datetime.now(timezone.utc) - timedelta(days=30)

        deleted_raw = db.query(RawScrapeData).filter(RawScrapeData.created_at < cutoff_raw).delete()
        deleted_sys = db.query(SystemLog).filter(SystemLog.created_at < cutoff_logs).delete()
        deleted_src = db.query(SourceLog).filter(SourceLog.created_at < cutoff_logs).delete()

        db.commit()
        if deleted_raw or deleted_sys or deleted_src:
            logger.info(f"Database retention cleanup: purged {deleted_raw} raw dumps, {deleted_sys} system logs, {deleted_src} source logs.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Database cleanup failed: {e}")
    finally:
        db.close()

def log_to_db(level: str, component: str, message: str, traceback: str = None):
    """
    Utility to save logs into the SystemLog table.
    """
    db = get_session()
    try:
        log_entry = SystemLog(
            level=level,
            component=component,
            message=message,
            traceback=traceback,
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log to DB: {e}")
    finally:
        db.close()

def job_listener(event):
    if event.exception:
        msg = f"Job {event.job_id} failed"
        logger.error(msg)
        log_to_db("ERROR", "Scheduler", msg, str(event.exception))
    else:
        msg = f"Job {event.job_id} completed successfully"
        logger.info(msg)
        log_to_db("INFO", "Scheduler", msg)


def _create_execution_record(run_id: str, sweep: str, initial_step: str, started_at: datetime) -> None:
    db = get_session()
    try:
        exec_record = PipelineExecution(
            id=run_id,
            sweep=sweep,
            trigger_type="scheduled",
            status="running",
            current_step=initial_step,
            force=0,
            started_at=started_at,
        )
        db.add(exec_record)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record scheduled start for {run_id}: {e}")
    finally:
        db.close()


def _update_execution_success(run_id: str, finished_at: datetime, duration_sec: float) -> None:
    db = get_session()
    try:
        rec = db.query(PipelineExecution).filter(PipelineExecution.id == run_id).first()
        if rec:
            rec.status = "completed"
            rec.current_step = "Completed successfully"
            rec.finished_at = finished_at
            rec.duration_sec = duration_sec
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record scheduled completion for {run_id}: {e}")
    finally:
        db.close()


def _update_execution_failure(
    run_id: str,
    sweep: str,
    finished_at: datetime,
    duration_sec: float,
    error: Exception,
    tb_str: str,
) -> None:
    db = get_session()
    try:
        err_msg = str(error)
        rec = db.query(PipelineExecution).filter(PipelineExecution.id == run_id).first()
        if rec:
            rec.status = "failed"
            rec.finished_at = finished_at
            rec.duration_sec = duration_sec
            rec.error_message = err_msg
            rec.current_step = f"Failed: {err_msg[:180]}"

        # Save error into SystemLog table
        sys_log = SystemLog(
            level="ERROR",
            component=f"Scheduler-{sweep}",
            message=f"Scheduled sweep '{sweep}' ({run_id}) failed: {err_msg}",
            traceback=tb_str,
        )
        db.add(sys_log)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record scheduled failure for {run_id}: {e}")
    finally:
        db.close()


def _update_execution_aborted(run_id: str, finished_at: datetime, duration_sec: float) -> None:
    db = get_session()
    try:
        rec = db.query(PipelineExecution).filter(PipelineExecution.id == run_id).first()
        if rec:
            rec.status = "aborted"
            rec.finished_at = finished_at
            rec.duration_sec = duration_sec
            rec.current_step = "Aborted or cancelled"
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record scheduled abort for {run_id}: {e}")
    finally:
        db.close()


def tracked_scheduled_job(sweep: str, initial_step: str, func):
    """
    Wraps a scheduled task function (sync or async) to record execution lifecycle
    into the PipelineExecution table and handle error logging.
    """
    is_coroutine = asyncio.iscoroutinefunction(func)

    async def async_wrapper(*args, **kwargs):
        start_t = datetime.now(timezone.utc)
        run_id = f"pipe-sched-{sweep}-{start_t.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4]}"
        logger.info(f"Starting scheduled execution '{run_id}' for sweep '{sweep}'")
        _create_execution_record(run_id, sweep, initial_step, start_t)

        try:
            if is_coroutine:
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            end_t = datetime.now(timezone.utc)
            dur = round((end_t - start_t).total_seconds(), 1)
            _update_execution_success(run_id, end_t, dur)
            logger.info(f"Completed scheduled execution '{run_id}' (duration: {dur}s)")
            return result
        except asyncio.CancelledError:
            end_t = datetime.now(timezone.utc)
            dur = round((end_t - start_t).total_seconds(), 1)
            _update_execution_aborted(run_id, end_t, dur)
            logger.warning(f"Scheduled execution '{run_id}' was cancelled (duration: {dur}s)")
            raise
        except Exception as e:
            end_t = datetime.now(timezone.utc)
            dur = round((end_t - start_t).total_seconds(), 1)
            tb_str = traceback.format_exc()
            _update_execution_failure(run_id, sweep, end_t, dur, e, tb_str)
            logger.error(f"Scheduled execution '{run_id}' failed: {e}\n{tb_str}")
            raise

    async_wrapper.__name__ = getattr(func, '__name__', f"scheduled_{sweep}")
    async_wrapper.__doc__ = getattr(func, '__doc__', None)
    return async_wrapper


_global_scheduler: Optional[AsyncIOScheduler] = None

def get_scheduler() -> Optional[AsyncIOScheduler]:
    """Returns the global AsyncIOScheduler instance if created."""
    global _global_scheduler
    return _global_scheduler

def create_configured_scheduler(loop=None) -> AsyncIOScheduler:
    """
    Creates and configures the AsyncIOScheduler instance with all recurring jobs.
    Does not start the scheduler, allowing external lifecycle management (e.g., FastAPI lifespan).
    """
    global _global_scheduler
    if _global_scheduler is not None and getattr(_global_scheduler, "running", False):
        return _global_scheduler

    if loop is None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

    scheduler = AsyncIOScheduler(timezone=pytz.UTC, event_loop=loop)

    # Add event listener for DB logging
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    # ── Live Real-Time IT News Feed (Every 15 minutes) ──
    news_agent = NewsAgent()
    scheduler.add_job(
        tracked_scheduled_job("news", "Fetching Live Real-Time News (RSS feeds)", news_agent.fetch_news),
        'interval', minutes=15,
        id='live_news_feed_job', name='Live Real-Time IT News Feed', replace_existing=True
    )

    # ── Mon/Thu Partitioned Sweeps ──
    # 09:00 UTC - Partition 1: Social Sweep
    scheduler.add_job(
        tracked_scheduled_job("social", "Partition 1: Social Discussions (Lobste.rs, Dev.to, Reddit)", run_social_sweep),
        'cron', day_of_week='mon,thu', hour=9, minute=0,
        id='social_sweep_job', name='Partition 1: Social Discussions (Lobste.rs, Dev.to, Reddit)', replace_existing=True
    )
    
    # 10:00 UTC - Partition 2: Technical Sweep
    scheduler.add_job(
        tracked_scheduled_job("tech", "Partition 2: Technical Trends (HackerNews, GitHub)", run_tech_sweep),
        'cron', day_of_week='mon,thu', hour=10, minute=0,
        id='tech_sweep_job', name='Partition 2: Technical Trends (HackerNews, GitHub)', replace_existing=True
    )

    # 11:00 UTC - Partition 3: Jobs Sweep
    scheduler.add_job(
        tracked_scheduled_job("jobs", "Partition 3: ATS Tech Jobs (Teamtailor)", run_jobs_sweep),
        'cron', day_of_week='mon,thu', hour=11, minute=0,
        id='jobs_sweep_job', name='Partition 3: ATS Tech Jobs (Teamtailor)', replace_existing=True
    )

    # 12:00 UTC - Partition 4: Final Synthesis
    scheduler.add_job(
        tracked_scheduled_job("synthesis", "Partition 4: AI Mathematical Synthesis (Clustering & Eras)", run_synthesis),
        'cron', day_of_week='mon,thu', hour=12, minute=0,
        id='synthesis_job', name='Partition 4: AI Mathematical Synthesis (Clustering & Eras)', replace_existing=True
    )

    # 03:00 UTC Daily - Database Retention Cleanup (prevent storage exhaustion)
    scheduler.add_job(
        tracked_scheduled_job("cleanup", "PostgreSQL Retention & Disk Cleanup", cleanup_stale_data),
        'cron', hour=3, minute=0,
        id='db_cleanup_job', name='PostgreSQL Retention & Disk Cleanup', replace_existing=True
    )

    # ── Weekly Developer Salary Benchmark Sweep (Sundays at 02:00 UTC) ──
    scheduler.add_job(
        tracked_scheduled_job("salary", "Developer Salary Benchmark Sweep", run_salary_sweep),
        'cron', day_of_week='sun', hour=2, minute=0,
        id='salary_sweep_job', name='Developer Salary Benchmark Sweep', replace_existing=True
    )

    _global_scheduler = scheduler
    return scheduler


async def main():
    logger.info("Starting AP Scheduler (Mon/Thu Partitioned Pipeline + 15m Live News)...")
    scheduler = create_configured_scheduler()
    scheduler.start()
    
    # Run initial tasks on startup with safe error logging
    async def safe_startup_task(name, coro):
        try:
            await coro
        except Exception as e:
            logger.error(f"Startup task '{name}' failed: {e}")

    # Run initial non-blocking cleanup and news fetch on startup
    cleanup_stale_data()
    news_agent = NewsAgent()
    asyncio.create_task(safe_startup_task("fetch_news", news_agent.fetch_news()))

    logger.info("Scheduler started with data retention cleaner. Press Ctrl+C to exit.")

    # Infinite loop
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutting down scheduler...")
        scheduler.shutdown()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
