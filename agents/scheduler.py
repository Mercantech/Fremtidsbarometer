import os
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from dotenv import load_dotenv
import pytz

# Import orchestrator & news agent
from agents.orchestrator import run_social_sweep, run_tech_sweep, run_jobs_sweep, run_synthesis, run_full_cycle
from agents.news_agent import NewsAgent
from datetime import datetime, timedelta, timezone
from database.models import SystemLog, RawScrapeData, SourceLog
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

async def main():
    logger.info("Starting AP Scheduler (Mon/Thu Partitioned Pipeline + 15m Live News)...")
    scheduler = AsyncIOScheduler(timezone=pytz.UTC)

    # Add event listener for DB logging
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    # ── Live Real-Time IT News Feed (Every 15 minutes) ──
    news_agent = NewsAgent()
    scheduler.add_job(
        news_agent.fetch_news, 'interval', minutes=15,
        id='live_news_feed_job', replace_existing=True
    )

    # ── Mon/Thu Partitioned Sweeps ──
    # 09:00 UTC - Partition 1: Social Sweep
    scheduler.add_job(
        run_social_sweep, 'cron', day_of_week='mon,thu', hour=9, minute=0,
        id='social_sweep_job', replace_existing=True
    )
    
    # 10:00 UTC - Partition 2: Technical Sweep
    scheduler.add_job(
        run_tech_sweep, 'cron', day_of_week='mon,thu', hour=10, minute=0,
        id='tech_sweep_job', replace_existing=True
    )

    # 11:00 UTC - Partition 3: Jobs Sweep
    scheduler.add_job(
        run_jobs_sweep, 'cron', day_of_week='mon,thu', hour=11, minute=0,
        id='jobs_sweep_job', replace_existing=True
    )

    # 12:00 UTC - Partition 4: Final Synthesis
    scheduler.add_job(
        run_synthesis, 'cron', day_of_week='mon,thu', hour=12, minute=0,
        id='synthesis_job', replace_existing=True
    )

    # 03:00 UTC Daily - Database Retention Cleanup (prevent storage exhaustion)
    scheduler.add_job(
        cleanup_stale_data, 'cron', hour=3, minute=0,
        id='db_cleanup_job', replace_existing=True
    )
    
    scheduler.start()
    
    # Run initial tasks on startup: cleanup, news fetch, full cycle
    cleanup_stale_data()
    asyncio.create_task(news_agent.fetch_news())
    asyncio.create_task(run_full_cycle())

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
