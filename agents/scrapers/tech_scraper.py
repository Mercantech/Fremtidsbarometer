import asyncio
import logging
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any

from database.models import RawScrapeData, SourceLog, TechTrend
from utils.logger import get_centralized_logger
from agents.scraper import PlaywrightScraper

logger = get_centralized_logger("TechScraper")

async def scrape_hackernews(db, source_id: int = None, max_stories: int = 25) -> int:
    """
    Fetches top stories and their top comments from Hacker News via Firebase API.
    Saves full discussion context into raw_scrape_data.
    """
    saved_count = 0
    base_url = "https://hacker-news.firebaseio.com/v0"
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            logger.info("Fetching HackerNews top stories...")
            resp = await client.get(f"{base_url}/topstories.json")
            if resp.status_code != 200:
                logger.warning(f"Failed to fetch HN top stories: HTTP {resp.status_code}")
                return 0
            
            story_ids = resp.json()[:max_stories]
            for s_id in story_ids:
                try:
                    s_resp = await client.get(f"{base_url}/item/{s_id}.json")
                    if s_resp.status_code != 200:
                        continue
                    
                    story = s_resp.json()
                    if not story or story.get("type") != "story":
                        continue
                    
                    title = story.get("title", "")
                    story_url = story.get("url", f"https://news.ycombinator.com/item?id={s_id}")
                    score = story.get("score", 0)
                    descendants = story.get("descendants", 0)
                    text = story.get("text", "")
                    kids = story.get("kids", [])
                    
                    # Fetch top 3 comments
                    comments = []
                    for k_id in kids[:3]:
                        try:
                            c_resp = await client.get(f"{base_url}/item/{k_id}.json")
                            if c_resp.status_code == 200:
                                c_data = c_resp.json()
                                if c_data and c_data.get("text"):
                                    comments.append(c_data["text"][:500])
                        except Exception:
                            pass
                    
                    formatted_entry = f"SOURCE: HackerNews\nTITLE: {title}\nSCORE: {score} | COMMENTS: {descendants}\nURL: {story_url}\n"
                    if text:
                        formatted_entry += f"BODY: {text[:1000]}\n"
                    if comments:
                        formatted_entry += "TOP COMMENTS:\n" + "\n---\n".join(comments)
                    
                    raw_entry = RawScrapeData(
                        source_id=source_id,
                        country_code="GLOBAL",
                        raw_text=formatted_entry,
                        extracted_urls=[story_url],
                        processed=0,
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(raw_entry)
                    saved_count += 1
                except Exception as s_err:
                    logger.debug(f"Error fetching HN item {s_id}: {s_err}")
            
            db.commit()
            logger.info(f"Saved {saved_count} HackerNews discussions.")
        except Exception as e:
            logger.error(f"Failed to scrape HackerNews: {e}")
            db.rollback()
            db.add(SourceLog(data_source_id=source_id or 1, error_message=str(e)))
            db.commit()

    return saved_count


async def scrape_github_trending(db, source_id: int = None) -> int:
    """
    Scrapes GitHub trending repositories and saves rich context into raw_scrape_data.
    """
    scraper = PlaywrightScraper()
    saved_count = 0
    try:
        await scraper.start()
        url = "https://github.com/trending"
        logger.info(f"Scraping GitHub Trending: {url}")
        
        page_text = await scraper.get_page_text(url)
        if page_text and len(page_text) > 100:
            formatted_entry = f"SOURCE: GitHub Trending\nDATE: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\nRAW_CONTENT:\n{page_text[:12000]}"
            
            raw_entry = RawScrapeData(
                source_id=source_id,
                country_code="GLOBAL",
                raw_text=formatted_entry,
                extracted_urls=[url],
                processed=0,
                created_at=datetime.now(timezone.utc)
            )
            db.add(raw_entry)
            db.commit()
            saved_count = 1
            logger.info("Saved GitHub Trending dump into raw_scrape_data.")
    except Exception as e:
        logger.error(f"Failed to scrape GitHub Trending: {e}")
        db.rollback()
        db.add(SourceLog(data_source_id=source_id or 1, error_message=str(e)))
        db.commit()
    finally:
        await scraper.stop()

    return saved_count
