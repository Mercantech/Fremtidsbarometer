import os
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from dotenv import load_dotenv
import pytz

# Import agents
from agents.news_agent import NewsAgent
from database.models import SystemLog
from database.session import get_session

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Scheduler")

load_dotenv()

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

# Agent instances
news_agent = NewsAgent()
# In the future we can add JobAgent, TrendAgent, etc.

async def run_news_agent():
    logger.info("Starting NewsAgent task")
    await news_agent.fetch_news()

async def main():
    logger.info("Starting AP Scheduler...")
    scheduler = AsyncIOScheduler(timezone=pytz.UTC)

    # Add event listener for DB logging
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    # Register jobs
    # NewsAgent: every 15 minutes
    scheduler.add_job(
        run_news_agent,
        'interval',
        minutes=15,
        id='news_agent_job',
        replace_existing=True
    )
    
    scheduler.start()
    
    # Run once immediately
    asyncio.create_task(run_news_agent())

    logger.info("Scheduler started. Press Ctrl+C to exit.")

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
