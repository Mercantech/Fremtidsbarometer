import asyncio
import logging
from dotenv import load_dotenv
from database.session import get_session
from database.models import DataSource, AIModelConfig
from utils.logger import get_centralized_logger

load_dotenv()

from agents.scrapers.social_scraper import scrape_reddit_discussions
from agents.scrapers.tech_scraper import scrape_hackernews, scrape_github_trending
from agents.scrapers.jobs_scraper import scrape_teamtailor_jobs
from agents.synthesizer import run_mathematical_synthesis

logger = get_centralized_logger("Orchestrator")

def get_active_model(db, task_type: str):
    """
    Fetches the active primary model configuration for a specific task.
    This allows the Admin Panel to dynamically change models without code edits.
    """
    model_config = db.query(AIModelConfig).filter(
        AIModelConfig.task_type == task_type,
        AIModelConfig.is_active == 1
    ).first()
    
    if not model_config:
        # Check fallback model
        model_config = db.query(AIModelConfig).filter(
            AIModelConfig.task_type == task_type,
            AIModelConfig.is_fallback == 1
        ).first()

    if not model_config:
        default_model = "gemini-2.5-pro" if task_type == "final_synthesis" else "gemini-3.8-flash"
        logger.warning(f"No active or fallback model found for {task_type}. Falling back to default: {default_model}")
        return {"provider": "google", "model_name": default_model}
        
    return {"provider": model_config.provider, "model_name": model_config.model_name}

def get_data_source_status(db, keyword: str):
    """
    Checks if a data source is registered and active in the database.
    Returns (is_active: bool, source_id: Optional[int]).
    """
    source = db.query(DataSource).filter(
        (DataSource.name.ilike(f"%{keyword}%")) |
        (DataSource.url.ilike(f"%{keyword}%"))
    ).first()
    if source is not None:
        return bool(source.is_active), source.id
    return True, None

async def run_social_sweep(db=None):
    """
    Run 1: Social Sweep. Parses deep discussions and comments from Reddit/Threads/Social.
    """
    should_close = False
    if db is None:
        db = get_session()
        should_close = True
        
    try:
        logger.info("=== Partition 1: Social Sweep ===")
        is_active, source_id = get_data_source_status(db, "Reddit")
        if not is_active:
            logger.info("⏩ Social sweep skipped: Reddit/Social data source is disabled in Admin Panel.")
            return 0

        count = await scrape_reddit_discussions(db, source_id=source_id or 1, limit_per_sub=15)
        logger.info(f"Partition 1 Complete: Scraped {count} social discussions.")
        return count
    except Exception as e:
        logger.error(f"Social sweep failed: {e}")
        db.rollback()
        raise e
    finally:
        if should_close:
            db.close()


async def run_tech_sweep(db=None):
    """
    Run 2: Technical Sweep. Parses HackerNews, GitHub Trending.
    """
    should_close = False
    if db is None:
        db = get_session()
        should_close = True

    try:
        logger.info("=== Partition 2: Technical Sweep ===")
        hn_active, hn_id = get_data_source_status(db, "HackerNews")
        gh_active, gh_id = get_data_source_status(db, "GitHub")

        if not hn_active and not gh_active:
            logger.info("⏩ Tech sweep skipped: Both HackerNews and GitHub are disabled in Admin Panel.")
            return 0, 0

        hn_count = 0
        gh_count = 0
        if hn_active:
            hn_count = await scrape_hackernews(db, source_id=hn_id or 2, max_stories=25)
        else:
            logger.info("⏩ HackerNews scraping skipped: Disabled in Admin Panel.")

        if gh_active:
            gh_count = await scrape_github_trending(db, source_id=gh_id or 3)
        else:
            logger.info("⏩ GitHub Trending scraping skipped: Disabled in Admin Panel.")

        logger.info(f"Partition 2 Complete: Scraped {hn_count} HN stories + {gh_count} GitHub dumps.")
        return hn_count, gh_count
    except Exception as e:
        logger.error(f"Tech sweep failed: {e}")
        db.rollback()
        raise e
    finally:
        if should_close:
            db.close()


async def run_jobs_sweep(db=None):
    """
    Run 3: Jobs & Salaries Sweep. Parses ATS and Aggregators.
    """
    should_close = False
    if db is None:
        db = get_session()
        should_close = True

    try:
        logger.info("=== Partition 3: Jobs & Salaries Sweep ===")
        tt_active, tt_id = get_data_source_status(db, "TeamTailor")
        if not tt_active:
            logger.info("⏩ Jobs sweep skipped: TeamTailor ATS data source is disabled in Admin Panel.")
            return 0
        
        jobs_count = await scrape_teamtailor_jobs(db, source_id=tt_id or 1)
        logger.info(f"Partition 3 Complete: Scraped {jobs_count} ATS jobs.")
        return jobs_count
    except Exception as e:
        logger.error(f"Jobs sweep failed: {e}")
        db.rollback()
        raise e
    finally:
        if should_close:
            db.close()


async def run_synthesis(db=None):
    """
    Run 4: Final Synthesis.
    Collects cross-platform data from raw_scrape_data, clusters topics via LLM,
    calculates deterministic mathematical hype shares, and commits to HypeAnalysis & Eras.
    """
    should_close = False
    if db is None:
        db = get_session()
        should_close = True

    try:
        logger.info("=== Partition 4: Final Synthesis & Deduplication ===")
        model = get_active_model(db, "final_synthesis")
        logger.info(f"Using Model for Synthesis: {model['model_name']} ({model['provider']})")
        
        results = await run_mathematical_synthesis(db, model_config=model)
        logger.info(f"Partition 4 Complete: Synthesized {len(results)} mathematical hype topics.")
        return results
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        db.rollback()
        raise e
    finally:
        if should_close:
            db.close()


from datetime import datetime, timedelta, timezone
from database.models import HypeAnalysis, RawScrapeData

def check_data_freshness(db=None, max_age_hours: int = 12):
    """
    Checks if fresh synthesized data and raw scrapes exist in the database.
    Returns a dictionary with status and metadata.
    """
    should_close = False
    if db is None:
        db = get_session()
        should_close = True

    try:
        threshold = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
        
        latest_hype = db.query(HypeAnalysis).filter(
            HypeAnalysis.created_at >= threshold
        ).order_by(HypeAnalysis.created_at.desc()).first()
        
        raw_recent_count = db.query(RawScrapeData).filter(
            RawScrapeData.created_at >= threshold
        ).count()
        
        is_fresh = bool(latest_hype and raw_recent_count >= 5)
        
        return {
            "is_fresh": is_fresh,
            "latest_hype_topic": latest_hype.topic if latest_hype else None,
            "latest_hype_created_at": latest_hype.created_at.isoformat() if latest_hype else None,
            "recent_raw_records": raw_recent_count,
            "max_age_hours": max_age_hours
        }
    finally:
        if should_close:
            db.close()


async def run_full_cycle(force: bool = False):
    """
    Runs all 4 sweeps sequentially for testing or manual pipeline execution.
    If force=False and fresh data exists (<12h), skips to avoid redundant AI token usage.
    """
    db = get_session()
    try:
        if not force:
            freshness = check_data_freshness(db, max_age_hours=12)
            if freshness["is_fresh"]:
                logger.info(f"⏩ Fresh data exists (topic: '{freshness['latest_hype_topic']}', {freshness['recent_raw_records']} raw records). Skipping full cycle to preserve AI tokens.")
                return {"status": "skipped", "reason": "fresh_data_exists", "freshness": freshness}

        logger.info("Starting Full Pipeline Cycle (Partitions 1-4)...")
        await run_social_sweep(db)
        await run_tech_sweep(db)
        await run_jobs_sweep(db)
        results = await run_synthesis(db)
        logger.info("Full Pipeline Cycle Completed Successfully!")
        return {"status": "success", "synthesized_topics": len(results) if results else 0}
    except Exception as e:
        logger.error(f"Full pipeline cycle failed: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_full_cycle(force=True))
