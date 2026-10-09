import asyncio
import logging
import httpx
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from bs4 import BeautifulSoup
from database.models import RawScrapeData, SourceLog, DataSource, TechTrend, SystemLog, AIModelConfig
from api.schemas import ExtractedTechSignal, TechExtractionPayload
from agents.ai_provider import analyze_with_fallback, AIProviderError
from utils.logger import get_centralized_logger

logger = get_centralized_logger("TechScraper")

async def scrape_hackernews(db, source_id: int = None, max_stories: int = 25) -> int:
    """
    Fetches top stories and their top comments from Hacker News via Firebase API.
    Checks DataSource table to verify it is active.
    """
    hn_src = db.query(DataSource).filter(
        DataSource.name.ilike("%HackerNews%"),
        DataSource.is_active == 1
    ).first()

    if not hn_src and source_id is None:
        logger.info("HackerNews is disabled in Admin Panel. Skipping.")
        return 0

    actual_source_id = hn_src.id if hn_src else source_id

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
                            source_id=actual_source_id,
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
            try:
                db.add(SourceLog(data_source_id=actual_source_id or 1, error_message=str(e)[:500]))
                db.commit()
            except Exception:
                db.rollback()

    return saved_count


async def scrape_github_trending(db, source_id: int = None) -> int:
    """
    Scrapes GitHub trending repositories from active GitHub sources in DataSource.
    Saves clean structured repository info and descriptions into raw_scrape_data.
    """
    active_sources = db.query(DataSource).filter(
        DataSource.name.ilike("%GitHub%"),
        DataSource.is_active == 1
    ).all()

    if not active_sources and source_id is None:
        logger.info("GitHub Trending sources disabled in Admin Panel.")
        return 0

    if not active_sources:
        active_sources = [type("DummyGH", (), {"id": source_id or 1, "name": "GitHub Trending", "url": "https://github.com/trending"})()]

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    total_saved = 0

    for src in active_sources:
        url = src.url
        try:
            logger.info(f"Scraping GitHub Trending [{src.name}]: {url}")
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code != 200:
                    logger.warning(f"GitHub Trending ({url}) returned status {resp.status_code}")
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                articles = soup.find_all("article", class_="Box-row")
                if not articles:
                    logger.warning(f"No trending repo articles found on {url}")
                    continue

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

                formatted_entry = f"SOURCE: {src.name}\nDATE: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\nTOTAL_REPOS: {len(trending_summaries)}\n\n"
                formatted_entry += "\n\n---\n\n".join(trending_summaries)

                raw_entry = RawScrapeData(
                    source_id=src.id,
                    country_code="GLOBAL",
                    raw_text=formatted_entry[:15000],
                    extracted_urls=extracted_urls[:25],
                    processed=0,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(raw_entry)
                db.commit()
                saved_count = len(trending_summaries)
                total_saved += saved_count
                logger.info(f"Saved {saved_count} GitHub repos from [{src.name}].")
        except Exception as e:
            logger.error(f"Failed to scrape GitHub [{src.name}]: {e}")
            db.rollback()
            try:
                db.add(SourceLog(data_source_id=src.id, error_message=str(e)[:500]))
                db.commit()
            except Exception:
                db.rollback()

    return total_saved


async def extract_tech_signals_with_ai(
    raw_tech_items: Optional[List[Dict[str, Any]]] = None,
    db=None
) -> Optional[List[Dict[str, Any]]]:
    """
    Stage 2: tech_extraction.
    Sends candidate HackerNews discussions and GitHub trending entries to the configured LLM
    (resolved from DB via AIModelConfig for task 'tech_extraction') for structured technical signal
    extraction with mandatory grounded quotations and source URLs.

    Returns list of validated ExtractedTechSignal dictionaries if successful.
    Returns empty list on failure or if no signals are grounded.
    """
    items_to_process: List[Dict[str, Any]] = []

    # 1. Ingest input items or query unprocessed records from DB
    if raw_tech_items is not None:
        items_to_process = list(raw_tech_items)
    elif db is not None:
        try:
            raw_records = db.query(RawScrapeData).filter(
                RawScrapeData.processed == 0,
                RawScrapeData.country_code == "GLOBAL"
            ).order_by(RawScrapeData.created_at.desc()).limit(20).all()

            for r in raw_records:
                text = r.raw_text or ""
                # Parse multiple GitHub repo entries if grouped
                if "---" in text and "REPO:" in text:
                    blocks = text.split("---")
                    for b in blocks:
                        b_strip = b.strip()
                        if not b_strip or "REPO:" not in b_strip:
                            continue
                        url_match = re.search(r"URL:\s*(https?://\S+)", b_strip)
                        repo_match = re.search(r"REPO:\s*([^\n]+)", b_strip)
                        url = url_match.group(1) if url_match else (r.extracted_urls[0] if r.extracted_urls else "")
                        title = repo_match.group(1).strip() if repo_match else "GitHub Repo"
                        items_to_process.append({
                            "url": url,
                            "title": title,
                            "text": b_strip,
                            "source": "github",
                            "record_id": r.id
                        })
                else:
                    url_match = re.search(r"URL:\s*(https?://\S+)", text)
                    title_match = re.search(r"TITLE:\s*([^\n]+)", text)
                    url = url_match.group(1) if url_match else (r.extracted_urls[0] if r.extracted_urls else "")
                    title = title_match.group(1).strip() if title_match else "HackerNews Discussion"
                    items_to_process.append({
                        "url": url,
                        "title": title,
                        "text": text,
                        "source": "hackernews",
                        "record_id": r.id
                    })
        except Exception as query_err:
            logger.warning(f"Error querying unprocessed RawScrapeData for tech_extraction: {query_err}")

    if not items_to_process:
        return []

    # 2. Resolve active AI model and fallback candidates from DB
    try:
        from agents.orchestrator import get_active_model
        active_config = get_active_model(db, "tech_extraction") if db else {"provider": "google", "model_name": "gemini-3.8-flash"}
    except Exception as e:
        logger.warning(f"Failed to query active model for tech_extraction: {e}")
        active_config = {"provider": "google", "model_name": "gemini-3.8-flash"}

    candidates = [active_config]
    if db:
        try:
            fallback_recs = db.query(AIModelConfig).filter(
                AIModelConfig.task_type == "tech_extraction",
                AIModelConfig.is_fallback == 1,
                AIModelConfig.is_active == 0
            ).all()
            for fb in fallback_recs:
                if not any(c.get("model_name") == fb.model_name and c.get("provider") == fb.provider for c in candidates):
                    candidates.append({
                        "provider": fb.provider,
                        "model_name": fb.model_name,
                    })
        except Exception as e:
            logger.warning(f"Could not load fallback models from DB for tech_extraction: {e}")

    if not any(c.get("model_name") == "gemini-3.8-flash" for c in candidates):
        candidates.append({"provider": "google", "model_name": "gemini-3.8-flash"})

    batch_size = 12
    all_grounded_signals: List[Dict[str, Any]] = []

    for b_idx in range(0, len(items_to_process), batch_size):
        batch = items_to_process[b_idx:b_idx + batch_size]

        # Build structured input text for prompt and url-to-raw map
        text_blocks = []
        url_to_raw = {}
        for idx, item in enumerate(batch):
            url = item.get("url") or item.get("link") or ""
            title = item.get("title") or ""
            content = item.get("text") or item.get("description") or ""
            snippet = content[:1500]
            url_to_raw[url] = f"{title} {content}"

            text_blocks.append(
                f"--- TECH ITEM #{idx+1} ---\n"
                f"URL: {url}\n"
                f"TITLE: {title}\n"
                f"CONTENT:\n{snippet}\n"
            )

        prompt = (
            "You are an expert Principal Systems Architect and Technology Trend Analyst.\n"
            "Your task is to extract concrete, grounded technical signals strictly from the provided raw tech items.\n\n"
            "STRICT EXTRACTION RULES:\n"
            "1. Every extracted signal MUST contain `source_url` (must exactly match one of the input URLs) and a verbatim `quote` (10-500 characters) from the raw text showing why this technology was mentioned.\n"
            "2. `technology`: The exact canonical name of the programming language, framework, database, tool, or library (e.g. 'Rust', 'FastAPI', 'Bun', 'PostgreSQL', 'PyTorch', 'vLLM', 'Docker'). Do NOT invent technologies.\n"
            "3. `signal_type`: One of 'new_release', 'rising_popularity', 'migration', 'outage', 'deprecation'.\n"
            "4. `context_summary`: A concise 10-400 character summary of what is happening with this technology.\n"
            "5. `sentiment`: One of 'positive', 'neutral', 'negative'.\n"
            "6. Every quote MUST be an exact verbatim quotation substring from the raw input text. If you cannot quote the raw text directly, DO NOT create a signal.\n"
            "7. Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "signals": [\n'
            '    {\n'
            '      "source_url": "https://...",\n'
            '      "quote": "verbatim text excerpt from item",\n'
            '      "technology": "Rust",\n'
            '      "signal_type": "rising_popularity",\n'
            '      "context_summary": "Increasing adoption for high-performance server microservices",\n'
            '      "sentiment": "positive"\n'
            '    }\n'
            '  ]\n'
            "}\n\n"
            "RAW INPUT ITEMS:\n" + "\n".join(text_blocks)
        )

        schema_instruction = 'Root JSON object with "signals" key containing array of ExtractedTechSignal objects.'

        try:
            result, meta = await analyze_with_fallback(candidates, prompt, schema_instruction, return_meta=True)
            payload = TechExtractionPayload(**result)

            grounded_signals = []
            for sig in payload.signals:
                if not sig.source_url or sig.source_url not in url_to_raw:
                    logger.warning(f"AI tech_extraction: Dropping signal with ungrounded URL '{sig.source_url}'")
                    continue
                if len(sig.quote.strip()) < 10:
                    logger.warning(f"AI tech_extraction: Dropping signal with short quote: '{sig.quote}'")
                    continue

                # Grounding anti-hallucination check: quote must be in source text
                clean_quote = re.sub(r"\s+", " ", sig.quote.strip().lower())
                clean_raw = re.sub(r"\s+", " ", url_to_raw[sig.source_url].lower())
                quote_sample = clean_quote[:min(25, len(clean_quote))]
                if quote_sample not in clean_raw and clean_quote not in clean_raw:
                    logger.warning(f"AI tech_extraction: Dropping signal '{sig.technology}' because quote '{sig.quote[:40]}' is not grounded in source text.")
                    continue

                grounded_signals.append(sig.model_dump())

            all_grounded_signals.extend(grounded_signals)

            # Log AI token usage and estimated cost to SystemLog
            if db:
                try:
                    sys_log = SystemLog(
                        level="INFO",
                        component="AIExtractor-tech_extraction",
                        message=(
                            f"AI tech_extraction succeeded with {meta.get('provider')}/{meta.get('model_name')}. "
                            f"Extracted {len(grounded_signals)} grounded tech signals. "
                            f"Tokens: {meta.get('prompt_tokens', 0)}+{meta.get('completion_tokens', 0)} "
                            f"(${meta.get('cost_usd', 0.0):.6f})"
                        ),
                        metadata_={
                            "task_type": "tech_extraction",
                            "model": meta.get("model_name"),
                            "provider": meta.get("provider"),
                            "prompt_tokens": meta.get("prompt_tokens", 0),
                            "completion_tokens": meta.get("completion_tokens", 0),
                            "cost_usd": meta.get("cost_usd", 0.0),
                            "fallback_used": meta.get("fallback_used", False),
                            "items_extracted": len(grounded_signals),
                            "status": "success"
                        }
                    )
                    db.add(sys_log)
                    db.commit()
                except Exception as log_err:
                    db.rollback()

            # Upsert into TechTrend table
            if db and grounded_signals:
                today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                for sig in grounded_signals:
                    tech_name = sig.get("technology", "").strip()
                    if not tech_name:
                        continue

                    trend = db.query(TechTrend).filter(
                        TechTrend.technology == tech_name,
                        TechTrend.country == "GLOBAL",
                        TechTrend.source == "tech_signal",
                        TechTrend.date == today
                    ).first()

                    sentiment = sig.get("sentiment", "neutral")
                    pop_delta = 5.0 if sentiment == "positive" else (-2.0 if sentiment == "negative" else 2.0)

                    if trend:
                        trend.mentions = (trend.mentions or 1) + 1
                        trend.popularity = min(99.0, max(15.0, round((trend.popularity or 50.0) + pop_delta, 1)))
                        meta_data = dict(trend.metadata_ or {})
                        sig_list = list(meta_data.get("signals", []))
                        sig_list.append(sig)
                        meta_data["signals"] = sig_list[-10:]
                        trend.metadata_ = meta_data
                    else:
                        init_pop = 55.0 if sentiment == "positive" else (45.0 if sentiment == "negative" else 50.0)
                        new_trend = TechTrend(
                            technology=tech_name,
                            country="GLOBAL",
                            source="tech_signal",
                            date=today,
                            popularity=init_pop,
                            mentions=1,
                            status="published",
                            metadata_={"signals": [sig]}
                        )
                        db.add(new_trend)

                try:
                    db.commit()
                except Exception as trend_err:
                    logger.warning(f"Error persisting TechTrend records: {trend_err}")
                    db.rollback()

            # Mark processed raw records in DB
            record_ids = [item.get("record_id") for item in batch if item.get("record_id")]
            if record_ids and db:
                try:
                    db.query(RawScrapeData).filter(RawScrapeData.id.in_(record_ids)).update(
                        {"processed": 1}, synchronize_session=False
                    )
                    db.commit()
                except Exception as proc_err:
                    logger.warning(f"Failed to update raw records processed status: {proc_err}")
                    db.rollback()

        except Exception as batch_err:
            logger.warning(f"AI tech_extraction batch failed: {batch_err}")
            if db:
                try:
                    db.add(SystemLog(
                        level="WARNING",
                        component="AIExtractor-tech_extraction",
                        message=f"AI tech_extraction batch error: {str(batch_err)[:400]}",
                        metadata_={"task_type": "tech_extraction", "status": "failed", "error": str(batch_err)[:300]}
                    ))
                    db.commit()
                except Exception:
                    db.rollback()
            if not all_grounded_signals:
                return None

    return all_grounded_signals
