import asyncio
import logging
from datetime import datetime, timezone
import os
import json
import httpx
from dotenv import load_dotenv

from sqlalchemy.exc import IntegrityError

from agents.base_agent import BaseAgent
from agents.ai_provider import GeminiProvider
from database.models import TechTrend
from database.session import get_session

load_dotenv()

logger = logging.getLogger("RedditAgent")
logging.basicConfig(level=logging.INFO)

class RedditAgent(BaseAgent):
    def __init__(self):
        super().__init__("RedditAgent")
        self.ai = GeminiProvider()

    async def fetch_trends(self):
        """Parsing subreddits via .json to collect trends and hype."""
        db = get_session()
        try:
            subreddits = ["programming", "webdev", "cscareerquestions"]
            all_titles = []
            
            async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:
                for sub in subreddits:
                    url = f"https://www.reddit.com/r/{sub}/.json"
                    self.logger.info(f"Scraping {url}...")
                    
                    try:
                        response = await client.get(url, timeout=10.0)
                        response.raise_for_status()
                        data = response.json()
                        children = data.get("data", {}).get("children", [])
                        for child in children:
                            title = child.get("data", {}).get("title")
                            if title:
                                all_titles.append(title)
                    except Exception as e:
                        self.logger.error(f"Failed to fetch or parse {url}: {e}")
                        continue

            if not all_titles:
                self.logger.warning("No titles extracted from Reddit.")
                return

            combined_text = "\n".join(all_titles)
            
            prompt = f"""
            Analyze the titles of hot posts from Reddit (programming, webdev, cscareerquestions):
            {combined_text[:15000]}
            
            Extract a list of programming languages, frameworks, or AI tools that are actively discussed.
            Example: Python, React, ChatGPT, Rust, Go.
            Count how many times each of them is mentioned in these titles (mentions field).
            
            ALL OUTPUT MUST BE IN ENGLISH.
            """
            
            schema = """
            JSON Format:
            {
              "trends": [
                {
                  "technology": "Rust",
                  "mentions": 5
                }
              ]
            }
            """
            
            result = await self.ai.analyze_json(prompt, schema)
            trends = result.get("trends", [])
            
            if not trends:
                self.logger.warning("No trends found by AI on Reddit.")
                return

            self.logger.info(f"AI extracted {len(trends)} trending technologies from Reddit.")
            
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            
            for item in trends:
                tech = item.get("technology")
                if not tech:
                    continue
                    
                tech = tech.strip()[:100]
                mentions = item.get("mentions", 1)
                
                # Popularity for Reddit is not obvious, take mentions * 10
                popularity = min(mentions * 10.0, 100.0)
                
                existing = db.query(TechTrend).filter(
                    TechTrend.technology == tech,
                    TechTrend.country == "GLOBAL",
                    TechTrend.source == "reddit",
                    TechTrend.date == today
                ).first()
                
                if existing:
                    existing.mentions = mentions
                    existing.popularity = popularity
                    self.logger.info(f"Updated {tech}: {mentions} mentions")
                else:
                    new_trend = TechTrend(
                        technology=tech,
                        country="GLOBAL",
                        source="reddit",
                        date=today,
                        popularity=popularity,
                        mentions=mentions,
                        metadata_={"type": "reddit_hype"}
                    )
                    db.add(new_trend)
                    self.logger.info(f"Added {tech}: {mentions} mentions")
            
            try:
                db.commit()
                self.logger.info("Successfully committed Reddit trends.")
            except IntegrityError as e:
                db.rollback()
                self.logger.error(f"Commit failed: {e}")
                
        except Exception as e:
            self.logger.error(f"Reddit agent failed: {e}")
            db.rollback()
            raise e
        finally:
            db.close()

if __name__ == "__main__":
    agent = RedditAgent()
    asyncio.run(agent.fetch_trends())
