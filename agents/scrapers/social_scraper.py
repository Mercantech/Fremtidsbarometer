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

async def scrape_reddit_discussions(db, source_id: int = None, limit_per_sub: int = 15) -> int:
    """
    Scrapes hot posts along with their selftext and top comments from key technical subreddits.
    Saves full discussion context into raw_scrape_data for deep synthesis.
    """
    saved_count = 0
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Fremtidsbarometer/1.0"
    }

    async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
        for sub in SUBREDDITS:
            url = f"https://www.reddit.com/r/{sub}/hot.json?limit={limit_per_sub}"
            logger.info(f"Scraping deep discussions from r/{sub}...")
            
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"Failed to fetch r/{sub}: HTTP {resp.status_code}")
                    db.add(SourceLog(data_source_id=source_id or 1, error_message=f"Reddit HTTP {resp.status_code}", http_status=resp.status_code))
                    continue
                
                data = resp.json()
                children = data.get("data", {}).get("children", [])
                
                for child in children:
                    post = child.get("data", {})
                    title = post.get("title", "").strip()
                    selftext = post.get("selftext", "").strip()
                    post_id = post.get("id")
                    permalink = post.get("permalink", "")
                    score = post.get("score", 0)
                    num_comments = post.get("num_comments", 0)
                    
                    if not title or post.get("stickied"):
                        continue

                    # Fetch top comments for deep discussion context if post has comments
                    comments_text = []
                    if num_comments > 3 and permalink:
                        try:
                            # Throttle slightly to respect rate limits
                            await asyncio.sleep(0.5)
                            comments_url = f"https://www.reddit.com{permalink}.json?limit=5&depth=1"
                            c_resp = await client.get(comments_url)
                            if c_resp.status_code == 200:
                                c_data = c_resp.json()
                                if isinstance(c_data, list) and len(c_data) > 1:
                                    comments_children = c_data[1].get("data", {}).get("children", [])
                                    for c_child in comments_children[:5]:
                                        c_body = c_child.get("data", {}).get("body", "").strip()
                                        if c_body and len(c_body) > 20 and c_body != "[deleted]":
                                            comments_text.append(c_body[:600])
                        except Exception as c_err:
                            logger.debug(f"Could not fetch comments for post {post_id}: {c_err}")
                    
                    # Format rich raw discussion block
                    formatted_discussion = f"SUBREDDIT: r/{sub}\nTITLE: {title}\nSCORE: {score} | COMMENTS: {num_comments}\n"
                    if selftext:
                        formatted_discussion += f"BODY: {selftext[:1500]}\n"
                    if comments_text:
                        formatted_discussion += "TOP COMMENTS:\n" + "\n---\n".join(comments_text)
                    
                    post_url = f"https://reddit.com{permalink}"
                    
                    raw_entry = RawScrapeData(
                        source_id=source_id,
                        country_code="GLOBAL",
                        raw_text=formatted_discussion,
                        extracted_urls=[post_url] if post_url else [],
                        processed=0,
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(raw_entry)
                    saved_count += 1
                
                db.commit()
                logger.info(f"Saved {len(children)} discussions from r/{sub}.")
                
            except Exception as e:
                logger.error(f"Error scraping r/{sub}: {e}")
                db.rollback()
                db.add(SourceLog(data_source_id=source_id or 1, error_message=str(e)))
                db.commit()

    return saved_count
