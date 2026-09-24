import asyncio
import logging
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any

from database.models import RawScrapeData, SourceLog
from utils.logger import get_centralized_logger

logger = get_centralized_logger("SocialScraper")

SUBREDDITS = [
    "LocalLLaMA",
    "programming",
    "webdev",
    "artificial",
    "MachineLearning",
    "cybersecurity",
    "cscareerquestions",
    "devops",
]

DEV_TO_TAGS = ["ai", "architecture", "devops", "security", "webdev"]

async def scrape_lobsters(client: httpx.AsyncClient, db, source_id: int = None) -> int:
    """Scrapes top technical discussions from Lobste.rs JSON feed."""
    saved = 0
    urls = [
        "https://lobste.rs/hottest.json",
        "https://lobste.rs/t/ai.json"
    ]
    for url in urls:
        try:
            resp = await client.get(url, timeout=12.0)
            if resp.status_code != 200:
                continue
            stories = resp.json()
            for story in stories[:20]:
                title = story.get("title", "").strip()
                description = story.get("description", "").strip()
                story_url = story.get("url", "")
                comments_url = story.get("comments_url", "")
                score = story.get("score", 0)
                comments_count = story.get("comment_count", 0)
                tags = story.get("tags", [])

                if not title:
                    continue

                formatted_text = (
                    f"PLATFORM: Lobste.rs\n"
                    f"TITLE: {title}\n"
                    f"TAGS: {', '.join(tags)}\n"
                    f"SCORE: {score} | COMMENTS: {comments_count}\n"
                )
                if description:
                    formatted_text += f"DESCRIPTION:\n{description[:1200]}\n"

                raw_entry = RawScrapeData(
                    source_id=source_id,
                    country_code="GLOBAL",
                    raw_text=formatted_text,
                    extracted_urls=[story_url or comments_url],
                    processed=0,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(raw_entry)
                saved += 1
            db.commit()
            logger.info(f"Saved {saved} discussions from {url}")
        except Exception as e:
            db.rollback()
            logger.warning(f"Error scraping Lobsters ({url}): {e}")
    return saved


async def scrape_dev_to(client: httpx.AsyncClient, db, source_id: int = None) -> int:
    """Scrapes trending technical articles and discussions from Dev.to public API."""
    saved = 0
    for tag in DEV_TO_TAGS:
        url = f"https://dev.to/api/articles?tag={tag}&top=7"
        try:
            resp = await client.get(url, timeout=12.0)
            if resp.status_code != 200:
                continue
            articles = resp.json()
            for art in articles[:10]:
                title = art.get("title", "").strip()
                description = art.get("description", "").strip()
                art_url = art.get("url", "")
                comments_count = art.get("comments_count", 0)
                reactions = art.get("public_reactions_count", 0)
                tag_list = art.get("tag_list", [])

                if not title:
                    continue

                formatted_text = (
                    f"PLATFORM: Dev.to\n"
                    f"TAG: {tag}\n"
                    f"TITLE: {title}\n"
                    f"TAGS: {', '.join(tag_list)}\n"
                    f"REACTIONS: {reactions} | COMMENTS: {comments_count}\n"
                    f"SUMMARY: {description[:1200]}\n"
                )

                raw_entry = RawScrapeData(
                    source_id=source_id,
                    country_code="GLOBAL",
                    raw_text=formatted_text,
                    extracted_urls=[art_url],
                    processed=0,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(raw_entry)
                saved += 1
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Error scraping Dev.to tag '{tag}': {e}")
    logger.info(f"Saved {saved} discussions from Dev.to.")
    return saved


async def scrape_reddit_discussions(db, source_id: int = None, limit_per_sub: int = 10) -> int:
    """
    Scrapes developer discussions across Lobste.rs, Dev.to, and Reddit (best-effort).
    Guarantees that Partition 1 always yields rich data even if Reddit blocks data-center IPs.
    """
    saved_count = 0
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Fremtidsbarometer/1.0"
    }

    async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
        # 1. Reliable Open Technical Communities first
        lobsters_count = await scrape_lobsters(client, db, source_id=source_id)
        saved_count += lobsters_count

        devto_count = await scrape_dev_to(client, db, source_id=source_id)
        saved_count += devto_count

        # 2. Reddit as best-effort (handled gracefully if 403)
        for sub in SUBREDDITS:
            url = f"https://www.reddit.com/r/{sub}/hot.json?limit={limit_per_sub}"
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    # Non-fatal: Reddit blocks server IPs
                    continue
                
                data = resp.json()
                children = data.get("data", {}).get("children", [])
                sub_saved = 0
                for child in children:
                    post = child.get("data", {})
                    title = post.get("title", "").strip()
                    selftext = post.get("selftext", "").strip()
                    permalink = post.get("permalink", "")
                    score = post.get("score", 0)
                    num_comments = post.get("num_comments", 0)
                    
                    if not title or post.get("stickied"):
                        continue

                    formatted_discussion = (
                        f"PLATFORM: Reddit r/{sub}\n"
                        f"TITLE: {title}\n"
                        f"SCORE: {score} | COMMENTS: {num_comments}\n"
                    )
                    if selftext:
                        formatted_discussion += f"BODY: {selftext[:1500]}\n"

                    post_url = f"https://reddit.com{permalink}" if permalink else ""
                    raw_entry = RawScrapeData(
                        source_id=source_id,
                        country_code="GLOBAL",
                        raw_text=formatted_discussion,
                        extracted_urls=[post_url] if post_url else [],
                        processed=0,
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(raw_entry)
                    sub_saved += 1
                db.commit()
                saved_count += sub_saved
            except Exception as e:
                db.rollback()
                logger.debug(f"Reddit r/{sub} skipped: {e}")

    logger.info(f"Social sweep completed. Total discussions saved: {saved_count}")
    return saved_count
