import os
import logging
import hashlib
import time
import asyncio
from datetime import datetime, timezone
import feedparser

from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv

from database.models import NewsItem, DataSource
from database.session import get_session
from utils.logger import get_centralized_logger

load_dotenv()

class NewsAgent:
    def __init__(self):
        self.logger = get_centralized_logger("NewsAgent")
        self.primary_rss = "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en"
        self.fallback_rss = [
            ("TechCrunch", "https://techcrunch.com/feed/"),
            ("Lobste.rs", "https://lobste.rs/rss"),
            ("Cloudflare Blog", "https://blog.cloudflare.com/rss/")
        ]

    async def fetch_news(self):
        self.logger.info("Fetching live IT news...")
        db = get_session()
        
        try:
            # Query active RSS data sources from the database
            db_sources = db.query(DataSource).filter(
                DataSource.is_active == 1,
                DataSource.source_type == "rss"
            ).all()

            rss_candidates = []
            for s in db_sources:
                if s.url and "salary" not in s.category.lower():
                    rss_candidates.append((s.name, s.url))

            # Default fallback candidates
            if not rss_candidates:
                rss_candidates = [("Google News", self.primary_rss)] + self.fallback_rss

            feed = None
            source_name = "Unknown"

            for candidate_name, candidate_url in rss_candidates:
                try:
                    parsed = await asyncio.to_thread(feedparser.parse, candidate_url)
                    if parsed and getattr(parsed, 'entries', None) and len(parsed.entries) > 0:
                        feed = parsed
                        source_name = candidate_name
                        self.logger.info(f"Successfully fetched {len(feed.entries)} entries from {candidate_name} ({candidate_url})")
                        break
                except Exception as ex:
                    self.logger.warning(f"Failed to fetch RSS from {candidate_name} ({candidate_url}): {ex}")
            
            if not feed or not getattr(feed, 'entries', None):
                self.logger.error("All RSS sources failed.")
                raise RuntimeError("All primary and fallback RSS sources failed to return entries.")

            new_items = 0
            for entry in feed.entries[:100]:
                url = entry.get("link", "")
                if not url:
                    continue
                    
                # sha256 of url as id
                item_id = hashlib.sha256(url.encode('utf-8')).hexdigest()[:16]
                
                # Check if exists
                existing = db.query(NewsItem).filter(NewsItem.id == item_id).first()
                if existing:
                    continue
                    
                title = entry.get("title", "")[:500]
                
                # Parse date
                pub_date = datetime.now(timezone.utc)
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    pub_date = datetime.fromtimestamp(time.mktime(entry.published_parsed), tz=timezone.utc)
                
                new_item = NewsItem(
                    id=item_id,
                    title=title,
                    url=url,
                    source=entry.get("source", {}).get("title") or source_name,
                    country="GLOBAL",
                    score=0,
                    created_at=pub_date
                )
                db.add(new_item)
                new_items += 1
                
            try:
                db.commit()
                self.logger.info(f"Added {new_items} new news items. News database updated successfully.")
            except IntegrityError as e:
                db.rollback()
                self.logger.error(f"Commit failed: {e}")
                raise e
        except Exception as e:
            self.logger.error(f"News agent failed: {e}")
            db.rollback()
            raise e
        finally:
            db.close()

if __name__ == "__main__":
    agent = NewsAgent()
    asyncio.run(agent.fetch_news())
