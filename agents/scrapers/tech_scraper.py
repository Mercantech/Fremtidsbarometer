import asyncio
import logging
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any

from bs4 import BeautifulSoup
from database.models import RawScrapeData, SourceLog, TechTrend
from utils.logger import get_centralized_logger

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
            sem = asyncio.Semaphore(8)

            async def fetch_story(s_id):
                async with sem:
                    try:
                        s_resp = await client.get(f"{base_url}/item/{s_id}.json")
                        if s_resp.status_code != 200:
                            return None
                        story = s_resp.json()
                        if not story or story.get("type") != "story":
                            return None

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

                        return RawScrapeData(
                            source_id=source_id,
                            country_code="GLOBAL",
                            raw_text=formatted_entry,
                            extracted_urls=[story_url],
                            processed=0,
                            created_at=datetime.now(timezone.utc)
                        )
                    except Exception as s_err:
                        logger.debug(f"Error fetching HN item {s_id}: {s_err}")
                        return None

            tasks = [fetch_story(s_id) for s_id in story_ids]
            raw_entries = await asyncio.gather(*tasks)
            valid_entries = [e for e in raw_entries if e is not None]
            for entry in valid_entries:
                db.add(entry)
            saved_count = len(valid_entries)
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
    Scrapes GitHub trending repositories via direct HTTP and BeautifulSoup parsing.
    Saves clean structured repository info and descriptions into raw_scrape_data.
    """
    saved_count = 0
    url = "https://github.com/trending"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    try:
        logger.info(f"Scraping GitHub Trending: {url}")
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.warning(f"GitHub Trending returned status {resp.status_code}")
                return 0

            soup = BeautifulSoup(resp.text, "html.parser")
            articles = soup.find_all("article", class_="Box-row")
            if not articles:
                logger.warning("No trending repo articles found on GitHub Trending page.")
                return 0

            trending_summaries = []
            extracted_urls = [url]

            for a in articles:
                h2 = a.find("h2")
                link_tag = h2.find("a") if h2 else None
                repo_name = link_tag.text.strip().replace(" ", "").replace("\n", "") if link_tag else "Unknown"
                repo_href = f"https://github.com/{repo_name}" if repo_name != "Unknown" else url

                p_tag = a.find("p")
                desc = p_tag.text.strip() if p_tag else "No description"

                lang_tag = a.find("span", itemprop="programmingLanguage")
                lang = lang_tag.text.strip() if lang_tag else "General"

                stars_el = a.find("span", class_="d-inline-block float-sm-right")
                stars_today = stars_el.text.strip() if stars_el else ""

                entry_text = f"REPO: {repo_name}\nLANGUAGE: {lang}\nSTARS_TODAY: {stars_today}\nDESCRIPTION: {desc}\nURL: {repo_href}"
                trending_summaries.append(entry_text)
                extracted_urls.append(repo_href)

            formatted_entry = f"SOURCE: GitHub Trending\nDATE: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\nTOTAL_REPOS: {len(trending_summaries)}\n\n"
            formatted_entry += "\n\n---\n\n".join(trending_summaries)

            raw_entry = RawScrapeData(
                source_id=source_id,
                country_code="GLOBAL",
                raw_text=formatted_entry[:15000],
                extracted_urls=extracted_urls[:25],
                processed=0,
                created_at=datetime.now(timezone.utc)
            )
            db.add(raw_entry)
            db.commit()
            saved_count = len(trending_summaries)
            logger.info(f"Saved {saved_count} GitHub Trending repos into raw_scrape_data.")
    except Exception as e:
        logger.error(f"Failed to scrape GitHub Trending: {e}")
        db.rollback()
        db.add(SourceLog(data_source_id=source_id or 1, error_message=str(e)))
        db.commit()

    return saved_count
