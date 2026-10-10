import os
import asyncio
import logging
import httpx
import feedparser
import re
from datetime import datetime, timezone
from typing import List, Dict, Any

from database.models import RawScrapeData, SourceLog, DataSource
from utils.logger import get_centralized_logger

logger = get_centralized_logger("SocialScraper")





async def scrape_lobsters(client: httpx.AsyncClient, db, source_id: int = None) -> int:
    """Scrapes top technical discussions from active Lobste.rs endpoints in DataSource."""
    query = db.query(DataSource)
    if source_id:
        query = query.filter(DataSource.id == source_id)
    else:
        query = query.filter(
            DataSource.name.ilike("%Lobste.rs%"),
            DataSource.is_active == 1
        )
    active_sources = query.all()

    if not active_sources:
        logger.info("Lobste.rs sources disabled or not configured.")
        return 0

    saved = 0
    for src in active_sources:
        url = (src.url or "").strip()
        # Normalize plain web URL to JSON API
        if url.rstrip("/") == "https://lobste.rs" and src.source_type == "api":
            url = "https://lobste.rs/hottest.json"

        try:
            # Handle RSS Feed
            if src.source_type == "rss" or url.endswith("/rss"):
                feed = await asyncio.to_thread(feedparser.parse, url)
                entries = getattr(feed, "entries", [])
                for entry in entries[:20]:
                    title = getattr(entry, "title", "").strip()
                    summary = getattr(entry, "summary", "").strip()
                    link = getattr(entry, "link", "")
                    if not title:
                        continue
                    formatted_text = (
                        f"PLATFORM: Lobste.rs (RSS)\n"
                        f"TITLE: {title}\n"
                        f"URL: {link}\n"
                    )
                    if summary:
                        formatted_text += f"DESCRIPTION:\n{summary[:1200]}\n"
                    raw_entry = RawScrapeData(
                        source_id=src.id,
                        country_code="GLOBAL",
                        raw_text=formatted_text,
                        extracted_urls=[link] if link else [],
                        processed=0,
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(raw_entry)
                    saved += 1
                db.commit()
                logger.info(f"Saved {saved} discussions from Lobsters RSS [{src.name}].")
                continue

            # Handle JSON API
            resp = await client.get(url, timeout=12.0)
            if resp.status_code != 200:
                logger.warning(f"Lobste.rs [{url}] returned status {resp.status_code}")
                continue

            c_type = resp.headers.get("content-type", "").lower()
            if "application/json" not in c_type and not url.endswith(".json"):
                logger.warning(f"Lobste.rs endpoint [{url}] returned non-JSON content ({c_type}), skipping JSON parser.")
                continue

            try:
                stories = resp.json()
            except Exception as json_err:
                logger.warning(f"Failed to decode JSON from Lobste.rs [{url}]: {json_err}")
                continue

            if not isinstance(stories, list):
                logger.warning(f"Lobste.rs JSON from [{url}] is not a list")
                continue

            for story in stories[:20]:
                if not isinstance(story, dict):
                    continue
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
                    f"TAGS: {', '.join(tags) if isinstance(tags, list) else ''}\n"
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
            try:
                db.query(SourceLog).filter(SourceLog.data_source_id == src.id).delete(synchronize_session=False)
                db.commit()
            except Exception:
                pass
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
    query = db.query(DataSource)
    if source_id:
        query = query.filter(DataSource.id == source_id)
    else:
        query = query.filter(
            DataSource.name.ilike("%Dev.to%"),
            DataSource.is_active == 1
        )
    active_sources = query.all()

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
            try:
                db.query(SourceLog).filter(SourceLog.data_source_id == src.id).delete(synchronize_session=False)
                db.commit()
            except Exception:
                pass
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


async def scrape_social_discussions(db, source_id: int = None, limit_per_sub: int = 10) -> int:
    """
    Scrapes developer discussions across active Lobste.rs and Dev.to sources.
    Respects active toggles in Admin Panel.
    """
    saved_count = 0
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Fremtidsbarometer/1.0"
    }

    async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
        # Reliable Open Technical Communities
        lobsters_count = await scrape_lobsters(client, db)
        saved_count += lobsters_count

        devto_count = await scrape_dev_to(client, db)
        saved_count += devto_count

    logger.info(f"Social sweep completed. Total discussions saved: {saved_count}")
    return saved_count


async def scrape_generic_discussion_rss(src: DataSource, db) -> int:
    """
    Parses an arbitrary technical or discussion RSS feed registered in DataSource.
    Saves entries into RawScrapeData for cross-platform topic clustering and trend synthesis.
    """
    url = (src.url or "").strip()
    if not url:
        return 0

    try:
        feed = await asyncio.to_thread(feedparser.parse, url)
        entries = getattr(feed, "entries", [])
        if not entries:
            return 0

        saved = 0
        for entry in entries[:25]:
            title = getattr(entry, "title", "").strip()
            summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
            link = getattr(entry, "link", "")
            if not title:
                continue

            clean_summary = ""
            if summary:
                clean_summary = re.sub(r"<[^>]+>", " ", str(summary))
                clean_summary = re.sub(r"\s+", " ", clean_summary).strip()

            formatted_text = (
                f"PLATFORM: {src.name}\n"
                f"TITLE: {title}\n"
                f"URL: {link}\n"
            )
            if clean_summary:
                formatted_text += f"DESCRIPTION:\n{clean_summary[:1200]}\n"

            raw_entry = RawScrapeData(
                source_id=src.id,
                country_code=src.country_code or "GLOBAL",
                raw_text=formatted_text,
                extracted_urls=[link] if link else [],
                processed=0,
                created_at=datetime.now(timezone.utc)
            )
            db.add(raw_entry)
            saved += 1

        db.commit()
        try:
            db.query(SourceLog).filter(SourceLog.data_source_id == src.id).delete(synchronize_session=False)
            db.commit()
        except Exception:
            pass
        logger.info(f"Saved {saved} discussions from generic RSS [{src.name}].")
        return saved
    except Exception as e:
        db.rollback()
        logger.warning(f"Error scraping discussion RSS [{src.name}]: {e}")
        try:
            db.add(SourceLog(data_source_id=src.id, error_message=str(e)[:500]))
            db.commit()
        except Exception:
            db.rollback()
        raise e


