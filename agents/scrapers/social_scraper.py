import os
import asyncio
import logging
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any

from database.models import RawScrapeData, SourceLog, DataSource
from utils.logger import get_centralized_logger

logger = get_centralized_logger("SocialScraper")


async def _get_reddit_oauth_token(client: httpx.AsyncClient) -> str:
    """Retrieves Reddit application-only OAuth token if client credentials exist in environment."""
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    if not client_id or not client_secret:
        return ""
    try:
        resp = await client.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            headers={"User-Agent": "FremtidsbarometerBot/1.0"},
            timeout=10.0
        )
        if resp.status_code == 200:
            return resp.json().get("access_token", "")
    except Exception as e:
        logger.debug(f"Failed to obtain Reddit OAuth token: {e}")
    return ""


async def scrape_lobsters(client: httpx.AsyncClient, db, source_id: int = None) -> int:
    """Scrapes top technical discussions from active Lobste.rs endpoints in DataSource."""
    active_sources = db.query(DataSource).filter(
        DataSource.name.ilike("%Lobste.rs%"),
        DataSource.is_active == 1
    ).all()

    if not active_sources:
        logger.info("Lobste.rs sources disabled or not configured.")
        return 0

    saved = 0
    for src in active_sources:
        url = src.url
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
                    source_id=src.id,
                    country_code="GLOBAL",
                    raw_text=formatted_text,
                    extracted_urls=[story_url or comments_url],
                    processed=0,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(raw_entry)
                saved += 1
            db.commit()
            logger.info(f"Saved {saved} discussions from Lobsters [{src.name}].")
        except Exception as e:
            db.rollback()
            logger.warning(f"Error scraping Lobsters ({url}): {e}")
            try:
                db.add(SourceLog(data_source_id=src.id, error_message=str(e)[:500]))
                db.commit()
            except Exception:
                db.rollback()
    return saved


async def scrape_dev_to(client: httpx.AsyncClient, db, source_id: int = None) -> int:
    """Scrapes trending technical articles from active Dev.to sources in DataSource."""
    active_sources = db.query(DataSource).filter(
        DataSource.name.ilike("%Dev.to%"),
        DataSource.is_active == 1
    ).all()

    if not active_sources:
        logger.info("Dev.to sources disabled or not configured.")
        return 0

    saved = 0
    for src in active_sources:
        tag = src.url.rstrip("/").split("/")[-1]
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
                    source_id=src.id,
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
            logger.warning(f"Error scraping Dev.to [{src.name}]: {e}")
            try:
                db.add(SourceLog(data_source_id=src.id, error_message=str(e)[:500]))
                db.commit()
            except Exception:
                db.rollback()
    logger.info(f"Saved {saved} discussions from active Dev.to sources.")
    return saved


async def scrape_reddit_discussions(db, source_id: int = None, limit_per_sub: int = 10) -> int:
    """
    Scrapes developer discussions across active Lobste.rs, Dev.to, and Reddit sources.
    Respects active toggles in Admin Panel.
    """
    saved_count = 0
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Fremtidsbarometer/1.0"
    }

    async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
        # 1. Reliable Open Technical Communities first
        lobsters_count = await scrape_lobsters(client, db)
        saved_count += lobsters_count

        devto_count = await scrape_dev_to(client, db)
        saved_count += devto_count

        # 2. Reddit active subreddits from DataSource
        active_reddit = db.query(DataSource).filter(
            DataSource.name.ilike("%Reddit%"),
            DataSource.is_active == 1
        ).all()

        if not active_reddit:
            logger.info("Reddit sources disabled or not configured.")
            return saved_count

        oauth_token = await _get_reddit_oauth_token(client)
        req_headers = {"Authorization": f"bearer {oauth_token}"} if oauth_token else {}
        base_domain = "oauth.reddit.com" if oauth_token else "www.reddit.com"

        for src in active_reddit:
            sub = src.url.rstrip("/").split("/")[-1]
            url = f"https://{base_domain}/r/{sub}/hot.json?limit={limit_per_sub}"
            try:
                resp = await client.get(url, headers=req_headers)
                if resp.status_code in (401, 403, 429):
                    try:
                        db.add(SourceLog(
                            data_source_id=src.id,
                            error_message=f"HTTP {resp.status_code} (Reddit API requires authentication or rate limit reached)",
                            http_status=resp.status_code
                        ))
                        db.commit()
                    except Exception:
                        db.rollback()

                    logger.info("Reddit public endpoint rate-limited/blocked. Skipped gracefully, proceeding with Lobste.rs and Dev.to.")
                    break
                elif resp.status_code != 200:
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
                        source_id=src.id,
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
                logger.debug(f"Reddit r/{sub} error: {e}")
                try:
                    db.add(SourceLog(data_source_id=src.id, error_message=str(e)[:500]))
                    db.commit()
                except Exception:
                    db.rollback()

    logger.info(f"Social sweep completed. Total discussions saved: {saved_count}")
    return saved_count
