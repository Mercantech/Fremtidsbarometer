import os
import logging
import hashlib
import time
import asyncio
from datetime import datetime, timezone
import feedparser

from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv

from agents.base_agent import BaseAgent
from database.models import NewsItem
from database.session import get_session

load_dotenv()

class NewsAgent(BaseAgent):
    def __init__(self):
        super().__init__("NewsAgent")
        self.primary_rss = "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en"
        self.fallback_rss = [
            "https://techcrunch.com/feed/",
            "https://lobste.rs/rss",
            "https://blog.cloudflare.com/rss/"
        ]

    async def fetch_news(self):
        self.logger.info("Fetching live IT news...")
        db = get_session()
        
        try:
            feed = None
            source_name = "Unknown"
            
            # Try primary
            try:
                feed = await asyncio.to_thread(feedparser.parse, self.primary_rss)
                if not feed.entries:
                    raise ValueError("No entries found in primary RSS")
                source_name = "Google News"
            except Exception as e:
                self.logger.warning(f"Failed to fetch primary RSS ({self.primary_rss}): {e}")
                # Try fallbacks
                for fallback in self.fallback_rss:
                    try:
                        feed = await asyncio.to_thread(feedparser.parse, fallback)
                        if feed.entries:
                            source_name = fallback.split("/")[2]
                            self.logger.info(f"Using fallback RSS: {fallback}")
                            break
                    except Exception as ex:
                        self.logger.warning(f"Failed to fetch fallback RSS ({fallback}): {ex}")
            
            if not feed or not getattr(feed, 'entries', None):
                self.logger.error("All RSS sources failed.")
                return

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
        except Exception as e:
            self.logger.error(f"News agent failed: {e}")
            db.rollback()
        finally:
            db.close()

if __name__ == "__main__":
    agent = NewsAgent()
    asyncio.run(agent.fetch_news())
