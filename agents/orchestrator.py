import asyncio
import logging
from database.session import get_session
from database.models import DataSource, SystemLog, SourceLog, AIModelConfig

logger = logging.getLogger("Orchestrator")

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
        logger.warning(f"No active model found for {task_type}. Falling back to default: gemini-3.5-flash")
        return {"provider": "google", "model_name": "gemini-3.5-flash"}
        
    return {"provider": model_config.provider, "model_name": model_config.model_name}

async def run_social_sweep(db):
    """
    Run 1: Social Sweep. Parses Reddit, Threads, Twitter.
    """
    logger.info("=== Partition 1: Social Sweep ===")
    
    # 1. Get the dynamic model config for this specific task
    model = get_active_model(db, "social_extraction")
    logger.info(f"Using Model: {model['model_name']} ({model['provider']})")
    
    social_sources = db.query(DataSource).filter(
        DataSource.is_active == 1,
        DataSource.category == 'hype'
    ).all()
    
    for source in social_sources:
        try:
            logger.info(f"Fetching Social Data from {source.name}...")
            # TODO: Add specific scrapers and pass raw text to LLM using `model` config
            # TODO: Save structured JSON to DB
        except Exception as e:
            logger.error(f"Failed to scrape {source.name}: {e}")
            db.add(SourceLog(data_source_id=source.id, error_message=str(e)))
    db.commit()


async def run_tech_sweep(db):
    """
    Run 2: Technical Sweep. Parses HackerNews, GitHub Trending.
    """
    logger.info("=== Partition 2: Technical Sweep ===")
    
    # 1. Get model config
    model = get_active_model(db, "tech_extraction")
    logger.info(f"Using Model: {model['model_name']} ({model['provider']})")
    
    tech_sources = db.query(DataSource).filter(
        DataSource.is_active == 1,
        DataSource.category == 'news'
    ).all()
    
    for source in tech_sources:
        try:
            logger.info(f"Fetching Tech Data from {source.name}...")
            # TODO: Add specific scrapers and pass raw text to LLM using `model` config
        except Exception as e:
            logger.error(f"Failed to scrape {source.name}: {e}")
            db.add(SourceLog(data_source_id=source.id, error_message=str(e)))
    db.commit()


async def run_jobs_sweep(db):
    """
    Run 3: Jobs & Salaries Sweep. Parses LinkedIn, Glassdoor, TeamTailor.
    """
    logger.info("=== Partition 3: Jobs & Salaries Sweep ===")
    
    # 1. Get model config
    model = get_active_model(db, "jobs_extraction")
    logger.info(f"Using Model: {model['model_name']} ({model['provider']})")
    
    job_sources = db.query(DataSource).filter(
        DataSource.is_active == 1,
        DataSource.category.in_(['jobs', 'salary'])
    ).all()
    
    for source in job_sources:
        try:
            logger.info(f"Fetching Job Data from {source.name}...")
            # TODO: Add specific scrapers and pass raw text to LLM using `model` config
        except Exception as e:
            logger.error(f"Failed to scrape {source.name}: {e}")
            db.add(SourceLog(data_source_id=source.id, error_message=str(e)))
    db.commit()


async def run_synthesis(db):
    """
    Run 4: Final Synthesis.
    Collects cross-platform data, deduplicates semantically, 
    calculates mathematical hype (share%), and commits to Eras.
    """
    logger.info("=== Final Synthesis & Deduplication ===")
    
    # Synthesis usually requires a more powerful, reasoning-heavy model (e.g. gpt-4o or claude-3.5-sonnet)
    model = get_active_model(db, "final_synthesis")
    logger.info(f"Using Model for Synthesis: {model['model_name']} ({model['provider']})")
    
    try:
        # TODO: 
        # 1. Query the last 3-4 days of data across all tables.
        # 2. Pass to Synthesizer LLM using `model` config for clustering and analysis.
        # 3. Calculate mathematical hype trend (current share % vs previous).
        # 4. Save results to Era / HypeAnalysis.
        logger.info("Synthesizing data into actionable insights...")
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        db.add(SystemLog(level="ERROR", component="Orchestrator-Synthesis", message=str(e)))
    db.commit()


async def run_full_cycle():
    """
    Helper function to manually run all sweeps and synthesis sequentially.
    Normally, the scheduler runs these separately at specific times.
    """
    db = get_session()
    try:
        logger.info("Starting Full Manual Pipeline Cycle...")
        await run_social_sweep(db)
        await run_tech_sweep(db)
        await run_jobs_sweep(db)
        await run_synthesis(db)
        logger.info("Full Pipeline Cycle Completed Successfully!")
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        db.add(SystemLog(level="ERROR", component="Orchestrator", message="Pipeline failed", traceback=str(e)))
        db.commit()
    finally:
        db.close()
