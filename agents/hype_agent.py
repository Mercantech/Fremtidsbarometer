import asyncio
import logging
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

from sqlalchemy.exc import IntegrityError

from agents.base_agent import BaseAgent
from agents.ai_provider import GeminiProvider
from database.models import TechTrend, NewsItem, HypeAnalysis
from database.session import get_session

load_dotenv()

logger = logging.getLogger("HypeAgent")
logging.basicConfig(level=logging.INFO)

class HypeAgent(BaseAgent):
    def __init__(self):
        super().__init__("HypeAgent")
        self.ai = GeminiProvider()

    async def analyze_hype(self):
        """Analyzes collected news and trends to create a Hype analysis summary."""
        db = get_session()
        try:
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            yesterday = today - timedelta(days=2)
            
            # Collect context from DB
            recent_trends = db.query(TechTrend).filter(TechTrend.date >= yesterday).all()
            recent_news = db.query(NewsItem).filter(NewsItem.created_at >= yesterday).all()
            
            if not recent_trends and not recent_news:
                self.logger.warning("No recent data found to analyze hype.")
                return
                
            context_text = "Tech Trends (GitHub/Reddit):\n"
            for t in recent_trends:
                context_text += f"- {t.technology} (Score: {t.popularity}, Source: {t.source})\n"
                
            context_text += "\nLatest IT News:\n"
            for n in recent_news:
                context_text += f"- {n.title} (Source: {n.source})\n"
                
            # Safeguard: if there is too little data, AI might hallucinate.
            if len(context_text.split("\n")) < 5:
                self.logger.warning("Too little data for meaningful hype analysis. Skipping.")
                return

            self.logger.info("Sending aggregated context to AI for Hype Analysis...")
            
            prompt = f"""
            Analyze the following summary of recent IT news and tech trends:
            {context_text[:15000]}
            
            Your task is to extract 3-5 main topics that are currently being fiercely discussed in the IT and AI sphere.
            These don't have to be specific programming languages. They can be concepts, debates, or new paradigms 
            (e.g., "Agentic AI Frameworks", "Replacing juniors with AI", "Migrating from React to HTMX", etc.).
            
            IMPORTANT: Do not focus exclusively on fears or negativity. Keep a balanced view, 
            describing the objective picture of the hype (what is rising, what is stable).
            
            ALL OUTPUT MUST BE IN ENGLISH.
            
            For each topic determine:
            1. topic - a short title in English (2-4 words).
            2. score - how hot the topic is (0-100).
            3. direction - 'rising', 'falling', or 'stable'.
            4. summary - a brief summary in English (1-2 sentences) of what exactly is being discussed.
            """
            
            schema = """
            JSON format:
            {
              "hype_topics": [
                {
                  "topic": "Agentic AI Frameworks",
                  "score": 95,
                  "direction": "rising",
                  "summary": "Developers are actively discussing the shift from simple chatbots to autonomous agents."
                }
              ]
            }
            """
            
            result = await self.ai.analyze_json(prompt, schema)
            hype_topics = result.get("hype_topics", [])
            
            if not hype_topics:
                self.logger.warning("No hype topics extracted by AI.")
                return

            self.logger.info(f"AI generated {len(hype_topics)} Hype topics.")
            
            for item in hype_topics:
                raw_topic = item.get("topic")
                if not raw_topic or not raw_topic.strip():
                    continue
                    
                topic = raw_topic.strip()[:200]
                
                # Check uniqueness for today
                existing = db.query(HypeAnalysis).filter(
                    HypeAnalysis.date == today,
                    HypeAnalysis.topic == topic
                ).first()
                
                if existing:
                    existing.score = item.get("score", 50)
                    existing.direction = item.get("direction", "stable")[:10]
                    existing.summary = item.get("summary", "")
                    self.logger.info(f"Updated Hype: {topic}")
                else:
                    new_hype = HypeAnalysis(
                        date=today,
                        topic=topic,
                        score=item.get("score", 50.0),
                        direction=item.get("direction", "stable")[:10],
                        summary=item.get("summary", ""),
                        sources=["github", "reddit", "news"]  # Generalized source
                    )
                    db.add(new_hype)
                    self.logger.info(f"Added Hype: {topic}")
            
            try:
                db.commit()
                self.logger.info("Successfully committed Hype Analysis.")
            except IntegrityError as e:
                db.rollback()
                self.logger.error(f"Commit failed: {e}")
                
        except Exception as e:
            self.logger.error(f"Hype agent failed: {e}")
            db.rollback()
            raise e
        finally:
            db.close()

if __name__ == "__main__":
    agent = HypeAgent()
    asyncio.run(agent.analyze_hype())
