import asyncio
import logging
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError

from agents.base_agent import BaseAgent
from agents.scraper import PlaywrightScraper
from agents.ai_provider import GeminiProvider
from database.models import TechTrend
from database.session import get_session

load_dotenv()

logger = logging.getLogger("GitHubAgent")
logging.basicConfig(level=logging.INFO)

class GitHubAgent(BaseAgent):
    def __init__(self):
        super().__init__("GitHubAgent")
        self.scraper = PlaywrightScraper()
        self.ai = GeminiProvider()

    async def fetch_trends(self):
        """Parsing github.com/trending to collect hyped technologies."""
        db = get_session()
        try:
            await self.scraper.start()
            url = "https://github.com/trending"
            self.logger.info(f"Scraping {url}...")
            
            page_text = await self.fetch_with_retry(self.scraper.get_page_text, url)
            
            if not page_text or len(page_text) < 100:
                self.logger.error("Failed to extract text from GitHub Trending.")
                return
                
            prompt = f"""
            Analyze the text from the GitHub Trending page:
            {page_text[:15000]}
            
            Extract a list of programming languages or major frameworks (technology) that are trending today,
            and the number of stars they gained today (stars).
            If a language is not specified, try to guess it from the framework name, but it's better to ignore it.
            Merge duplicate languages by summing their stars.
            Return the top 10 most popular languages for today.
            
            ALL OUTPUT MUST BE IN ENGLISH.
            """
            
            schema = """
            JSON Format:
            {
              "trends": [
                {
                  "technology": "Python",
                  "stars_today": 1500
                }
              ]
            }
            """
            
            result = await self.ai.analyze_json(prompt, schema)
            trends = result.get("trends", [])
            
            if not trends:
                self.logger.warning("No trends found by AI.")
                return

            self.logger.info(f"AI extracted {len(trends)} trending technologies.")
            
            # Find maximum for normalization in popularity (0-100)
            max_stars = max([t.get("stars_today", 1) for t in trends] + [1])
            
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            
            for item in trends:
                tech = item.get("technology")
                if not tech:
                    continue
                    
                tech = tech.strip()[:100]
                stars = item.get("stars_today", 0)
                
                # Popularity 0-100
                popularity = (stars / max_stars) * 100.0 if max_stars > 0 else 0
                
                # Check if there is already a trend for today
                existing = db.query(TechTrend).filter(
                    TechTrend.technology == tech,
                    TechTrend.country == "GLOBAL",
                    TechTrend.source == "github",
                    TechTrend.date == today
                ).first()
                
                if existing:
                    existing.mentions = stars
                    existing.popularity = popularity
                    self.logger.info(f"Updated {tech}: {stars} stars")
                else:
                    new_trend = TechTrend(
                        technology=tech,
                        country="GLOBAL",
                        source="github",
                        date=today,
                        popularity=popularity,
                        mentions=stars,
                        metadata_={"type": "github_trending"}
                    )
                    db.add(new_trend)
                    self.logger.info(f"Added {tech}: {stars} stars")
            
            try:
                db.commit()
                self.logger.info("Successfully committed GitHub trends.")
            except IntegrityError as e:
                db.rollback()
                self.logger.error(f"Commit failed: {e}")
                
        except Exception as e:
            self.logger.error(f"GitHub agent failed: {e}")
            db.rollback()
        finally:
            await self.scraper.stop()
            db.close()

if __name__ == "__main__":
    agent = GitHubAgent()
    asyncio.run(agent.fetch_trends())
