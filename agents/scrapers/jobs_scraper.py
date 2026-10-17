import asyncio
import logging
import httpx
import feedparser
import re
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Dict, Any

from database.models import RawScrapeData, SourceLog, JobPosting, DataSource
from utils.logger import get_centralized_logger
from sqlalchemy.dialects.postgresql import insert as pg_insert

from agents.scrapers.jobs_heuristics import (
    TECH_KEYWORDS,
    EXCLUDE_KEYWORDS,
    REMOTE_KEYWORD_PATTERN,
    SALARY_PATTERNS,
    CURRENCY_USD_RATES,
    SALARY_PREFIXES,
    SALARY_RANGE_PATTERN,
    SALARY_SINGLE_PATTERN,
    infer_technology,
    infer_seniority,
    infer_location,
    extract_salary,
    parse_numeric_salary,
    calculate_match_score,
)
from agents.ai_provider import analyze_with_fallback, AIProviderError
import agents.scrapers.jobs_ai as _jobs_ai

async def extract_jobs_with_ai(*args, **kwargs):
    """
    Backward-compatible wrapper delegating to agents.scrapers.jobs_ai.extract_jobs_with_ai.
    Respects any test mocks placed directly on jobs_scraper.analyze_with_fallback.
    """
    import sys
    current_module = sys.modules[__name__]
    current_mock = getattr(current_module, "analyze_with_fallback", _jobs_ai.analyze_with_fallback)
    if current_mock is not _jobs_ai.analyze_with_fallback:
        orig = _jobs_ai.analyze_with_fallback
        try:
            _jobs_ai.analyze_with_fallback = current_mock
            return await _jobs_ai.extract_jobs_with_ai(*args, **kwargs)
        finally:
            _jobs_ai.analyze_with_fallback = orig
    return await _jobs_ai.extract_jobs_with_ai(*args, **kwargs)

logger = get_centralized_logger("JobsScraper")


async def _persist_extracted_jobs(
    candidates: List[Dict[str, Any]],
    src: DataSource,
    source_slug: str,
    db
) -> int:
    """
    Unified persistence pipeline for job postings:
    1. Filters candidate links against existing JobPosting URLs in DB.
    2. Runs AI extraction with grounding verification for new/unresolved items.
    3. Normalizes technology, seniority, location, and salary disclosures.
    4. Persists RawScrapeData and upserts JobPosting via PostgreSQL ON CONFLICT.
    5. Clears previous SourceLog failures on success.
    Returns count of newly saved or updated jobs.
    """
    if not candidates:
        return 0

    candidate_links = [c["link"] for c in candidates if c.get("link")]
    if not candidate_links:
        return 0

    existing_job_map = {
        r[0]: r[1]
        for r in db.query(JobPosting.url, JobPosting.salary_min).filter(JobPosting.url.in_(candidate_links)).all()
    }

    # Stage 1: AI-powered extraction with strict grounding
    items_for_ai = [
        {
            "url": c["link"],
            "title": c["title"],
            "company": c["company"],
            "location_hint": c.get("loc_hint", ""),
            "description": c.get("description", "")
        }
        for c in candidates
        if c["link"] not in existing_job_map or existing_job_map[c["link"]] is None
    ]
    ai_results = await extract_jobs_with_ai(items_for_ai, db)
    ai_map = {j["source_url"]: j for j in ai_results} if ai_results is not None else {}

    new_jobs = []
    new_raw_entries = []

    for c in candidates:
        link = c["link"]
        is_existing = link in existing_job_map
        if is_existing and existing_job_map[link] is not None:
            continue

        ai_job = ai_map.get(link)

        title = c["title"]
        desc = c.get("description", "")
        company = c.get("company", "Tech Company")
        loc_hint = c.get("loc_hint", "")

        tech_category = infer_technology(title)
        seniority = infer_seniority(title, desc)
        country, city = infer_location(
            title=title,
            description=desc,
            company_domain=company.lower().replace(" ", "")[:50],
            extra_hint=loc_hint,
            source_hint=f"{src.name} {src.url or ''}"
        )
        if country == "GLOBAL" and getattr(src, "country_code", None) and src.country_code != "GLOBAL":
            country = src.country_code

        score, reason = calculate_match_score(title, desc, tech_category)

        full_job_text = f"{title} {loc_hint} {desc}"
        salary_text = extract_salary(full_job_text)
        salary_min, salary_max, salary_curr = parse_numeric_salary(full_job_text)

        if salary_min is None and c.get("sal_min_direct") and c.get("sal_max_direct"):
            salary_min = float(c["sal_min_direct"])
            salary_max = float(c["sal_max_direct"])
            salary_curr = "USD"
            salary_text = f"${salary_min:,.0f} - ${salary_max:,.0f} USD"

        is_remote = c.get("is_remote", False) or bool(REMOTE_KEYWORD_PATTERN.search(full_job_text))

        tags = [seniority, tech_category.lower(), source_slug]
        for extra_t in c.get("tags") or []:
            if str(extra_t).lower() not in tags:
                tags.append(str(extra_t).lower())
        if is_remote and "remote" not in tags:
            tags.append("remote")
        if (salary_text or salary_min is not None) and "salary_disclosed" not in tags:
            tags.append("salary_disclosed")

        grounded_quote = None
        if ai_job:
            if ai_job.get("title"):
                title = ai_job["title"]
            if ai_job.get("company"):
                company = ai_job["company"]
            if ai_job.get("country"):
                country = ai_job["country"]
            if ai_job.get("city"):
                city = ai_job["city"]
            if ai_job.get("seniority"):
                seniority = ai_job["seniority"]
            if ai_job.get("technologies"):
                tech_category = ai_job["technologies"][0] if ai_job["technologies"] else tech_category
                for t in ai_job["technologies"]:
                    t_str = str(t).lower()
                    if t_str not in tags:
                        tags.append(t_str)
            if ai_job.get("salary_min") is not None and salary_min is None:
                salary_min = float(ai_job["salary_min"])
                salary_max = float(ai_job["salary_max"]) if ai_job.get("salary_max") is not None else salary_min
                salary_curr = ai_job.get("salary_currency") or "EUR"
                salary_text = f"{salary_curr} {salary_min:,.0f} - {salary_max:,.0f}"
                if "salary_disclosed" not in tags:
                    tags.append("salary_disclosed")
            tags.append("ai_extracted")
            grounded_quote = ai_job.get("quote")

        if is_existing:
            if salary_min is not None:
                db.query(JobPosting).filter(JobPosting.url == link).update({
                    "salary_min": salary_min,
                    "salary_max": salary_max,
                    "salary_currency": salary_curr,
                    "tags": tags,
                }, synchronize_session=False)
            continue

        formatted_job = (
            f"COMPANY: {company}\n"
            f"JOB_TITLE: {title}\n"
            f"CATEGORY: {tech_category}\n"
            f"SENIORITY: {seniority}\n"
            f"LOCATION: {city}, {country}\n"
            f"URL: {link}\n"
        )
        if grounded_quote:
            formatted_job += f"GROUNDED_QUOTE: {grounded_quote}\n"
        if salary_text:
            formatted_job += f"SALARY: {salary_text}\n"
        formatted_job += f"DESCRIPTION:\n{desc[:2500]}"

        new_raw_entries.append(RawScrapeData(
            source_id=src.id,
            country_code=country,
            raw_text=formatted_job,
            extracted_urls=[link],
            processed=0,
            created_at=datetime.now(timezone.utc)
        ))

        new_jobs.append({
            "title": title[:500],
            "company": company[:200],
            "url": link[:1000],
            "source": source_slug,
            "country": country,
            "city": city,
            "technology": tech_category,
            "tags": tags,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_currency": salary_curr,
            "date": datetime.now(timezone.utc),
            "match_score": score,
            "match_reason": reason,
            "status": "published"
        })

    saved = 0
    if new_raw_entries:
        db.add_all(new_raw_entries)
    if new_jobs:
        deduped = []
        seen = set()
        for j in new_jobs:
            k = (j["title"], j["company"], j["source"])
            if k not in seen:
                seen.add(k)
                deduped.append(j)

        stmt = pg_insert(JobPosting).values(deduped)
        stmt = stmt.on_conflict_do_update(
            index_elements=["title", "company", "source"],
            set_={
                "salary_min": stmt.excluded.salary_min,
                "salary_max": stmt.excluded.salary_max,
                "salary_currency": stmt.excluded.salary_currency,
                "tags": stmt.excluded.tags,
            }
        )
        db.execute(stmt)
        saved = len(deduped)
    db.commit()

    # Auto-heal: on successful save, clear previous failure logs for this source
    try:
        db.query(SourceLog).filter(SourceLog.data_source_id == src.id).delete(synchronize_session=False)
        db.commit()
    except Exception:
        pass

    logger.info(f"Saved {saved} jobs from source [{src.name}].")
    return saved


async def _scrape_job_api_source(src: DataSource, db) -> int:
    """
    Parses modern JSON API job endpoints (e.g. Arbeitnow European tech board, RemoteOK).
    Extracts tech roles, normalizes location across European tech hubs,
    discovers salary disclosures, and saves structured JobPostings and RawScrapeData.
    """
    url = src.url
    logger.info(f"Fetching job API [{src.name}]: {url}")
    headers = {
        "User-Agent": "Fremtidsbarometer-Bot/1.0 (+https://fremtidsbarometer.dk; tech trend observatory)"
    }
    async with httpx.AsyncClient(headers=headers, timeout=20.0, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning(f"Failed to fetch job API [{src.name}]: HTTP {resp.status_code}")
                return 0

            c_type = resp.headers.get("content-type", "").lower()
            # Allow JSON endpoints even if content-type header is text/plain or missing
            is_probably_json = "application/json" in c_type or url.endswith(".json") or "api" in url or resp.text.strip().startswith(("{", "["))
            if not is_probably_json:
                logger.warning(f"Job API endpoint [{src.name}] returned non-JSON ({c_type}), skipping API parser.")
                return 0

            data = resp.json()
        except Exception as e:
            logger.warning(f"Error requesting job API [{src.name}]: {e}")
            return 0

    # Determine source slug
    if "jobicy" in url:
        source_slug = "jobicy"
    elif "jobtechdev" in url or "jobsearch" in url:
        source_slug = "jobtech_se"
    elif "arbeitnow" in url:
        source_slug = "arbeitnow"
    elif "remoteok" in url:
        source_slug = "remoteok"
    else:
        clean_name = re.sub(r"[^a-zA-Z0-9_]", "", src.name.lower().replace(" ", "_"))[:30]
        source_slug = clean_name or "job_api"

    # Universal root list extractor (Jobicy: 'jobs', JobTech SE: 'hits', Arbeitnow: 'data', generic lists)
    raw_items = []
    if isinstance(data, dict):
        for candidate_key in ("jobs", "hits", "data", "results", "vacancies", "items"):
            if isinstance(data.get(candidate_key), list):
                raw_items = [i for i in data[candidate_key] if isinstance(i, dict)]
                break
    elif isinstance(data, list):
        raw_items = [i for i in data if isinstance(i, dict)]

    if not raw_items:
        logger.info(f"No job records found in API payload from [{src.name}].")
        return 0

    candidates = []
    candidate_links = []
    for item in raw_items:
        # Title extraction (Jobicy 'jobTitle', JobTech 'headline', standard 'title' / 'position')
        title = (
            item.get("title")
            or item.get("jobTitle")
            or item.get("headline")
            or item.get("position")
            or item.get("name")
            or ""
        ).strip()

        # Link extraction (JobTech 'webpage_url', Jobicy 'url', standard 'url' / 'link')
        link = (
            item.get("url")
            or item.get("webpage_url")
            or item.get("link")
            or item.get("apply_url")
            or ""
        ).strip()

        if not title or not link:
            continue

        t_lower = title.lower()
        if any(ex in t_lower for ex in EXCLUDE_KEYWORDS):
            continue
        if not any(k in t_lower for k in TECH_KEYWORDS):
            continue

        # Company extraction (JobTech nested employer.name, Jobicy 'companyName', standard 'company_name' / 'company')
        company = ""
        employer_obj = item.get("employer")
        if isinstance(employer_obj, dict):
            company = (employer_obj.get("name") or "").strip()
        elif isinstance(employer_obj, str):
            company = employer_obj.strip()

        if not company:
            company = (
                item.get("company_name")
                or item.get("companyName")
                or item.get("company")
                or item.get("hiring_organization")
                or ""
            ).strip()
        company = company or "Tech Enterprise"

        # Description extraction (JobTech nested description.text, Jobicy 'jobDescription', standard 'description')
        raw_desc = ""
        desc_obj = item.get("description")
        if isinstance(desc_obj, dict):
            raw_desc = desc_obj.get("text") or desc_obj.get("formatted") or ""
        elif isinstance(desc_obj, str):
            raw_desc = desc_obj

        if not raw_desc:
            raw_desc = (
                item.get("jobDescription")
                or item.get("jobExcerpt")
                or item.get("excerpt")
                or item.get("snippet")
                or ""
            )

        clean_desc = re.sub(r"<[^>]+>", " ", str(raw_desc))
        clean_desc = re.sub(r"\s+", " ", clean_desc).strip()

        # Location extraction (JobTech workplace_address.municipality, Jobicy 'jobGeo', standard 'location')
        loc_hint = ""
        workplace_addr = item.get("workplace_address")
        if isinstance(workplace_addr, dict):
            loc_hint = (
                workplace_addr.get("municipality")
                or workplace_addr.get("city")
                or workplace_addr.get("region")
                or ""
            ).strip()

        if not loc_hint:
            loc_hint = (
                item.get("jobGeo")
                or item.get("location")
                or item.get("city")
                or item.get("candidate_required_location")
                or ""
            ).strip()

        # Contextual country hint from registered DataSource metadata
        src_country = getattr(src, "country_code", None)
        if src_country and src_country not in ("GLOBAL", ""):
            if src_country not in loc_hint:
                loc_hint = f"{loc_hint}, {src_country}".strip(", ")

        is_remote = bool(
            item.get("remote")
            or item.get("is_remote")
            or (item.get("workplace_model") == "remote")
            or (isinstance(item.get("jobType"), list) and "Remote" in item.get("jobType"))
            or ("remote" in loc_hint.lower())
        )

        sal_min_direct = item.get("salary_min") or item.get("min_salary") or item.get("salary_from")
        sal_max_direct = item.get("salary_max") or item.get("max_salary") or item.get("salary_to")
        sal_desc = item.get("salary_description") or ""
        if not sal_min_direct and sal_desc:
            clean_desc += f" SALARY_HINT: {sal_desc}"

        raw_tags = item.get("tags") or item.get("jobIndustry") or item.get("skills") or []
        tags_list = []
        if isinstance(raw_tags, list):
            tags_list = [str(t).strip() for t in raw_tags if str(t).strip()]
        elif isinstance(raw_tags, str):
            tags_list = [t.strip() for t in raw_tags.split(",") if t.strip()]

        job_level = item.get("jobLevel")
        if job_level and isinstance(job_level, str):
            tags_list.append(job_level.lower())

        candidates.append({
            "title": title,
            "company": company,
            "link": link,
            "description": clean_desc,
            "loc_hint": loc_hint,
            "is_remote": is_remote,
            "tags": tags_list,
            "sal_min_direct": float(sal_min_direct) if isinstance(sal_min_direct, (int, float)) and sal_min_direct > 0 else None,
            "sal_max_direct": float(sal_max_direct) if isinstance(sal_max_direct, (int, float)) and sal_max_direct > 0 else None,
        })

    return await _persist_extracted_jobs(candidates, src, source_slug, db)


async def scrape_all_jobs(db, source_id: int = None) -> int:
    """
    Parses active job sources registered in data_sources (both RSS feeds and JSON APIs).
    Filters for genuine tech/IT positions, extracts location & seniority across Europe,
    discovers salary disclosures, and saves structured JobPostings and RawScrapeData.
    """
    query = db.query(DataSource)
    if source_id:
        query = query.filter(DataSource.id == source_id)
    else:
        query = query.filter(
            DataSource.category == "jobs",
            DataSource.is_active == 1
        )
    active_sources = query.all()

    if not active_sources:
        logger.info("No active job data sources found in database. Skipping jobs sweep.")
        return 0

    saved_count = 0
    
    for src in active_sources:
        rss_url = src.url or ""

        # Skip misclassified social or discussion feeds
        if "watercooler" in rss_url.lower():
            logger.info(f"Skipping non-job discussion feed [{src.name}].")
            continue

        # ── JSON API Dispatch (e.g. Arbeitnow, RemoteOK) ──
        is_api = (
            getattr(src, "source_type", "rss") == "api"
            and not rss_url.endswith(".rss")
            and "/rss" not in rss_url
            and "feed" not in rss_url
        )
        if is_api:
            try:
                api_saved = await _scrape_job_api_source(src, db)
                saved_count += api_saved
            except Exception as e:
                logger.warning(f"Error scraping job API [{src.name}]: {e}")
            continue

        logger.info(f"Fetching job RSS [{src.name}]: {rss_url}")
        
        try:
            feed = await asyncio.to_thread(feedparser.parse, rss_url)
            entries = getattr(feed, "entries", [])
            if not entries:
                continue

            src_lower = (src.name + " " + rss_url).lower()
            if "djinni" in src_lower:
                source_slug = "djinni"
            elif "dou" in src_lower:
                source_slug = "dou"
            elif "teamtailor" in src_lower:
                source_slug = "teamtailor"
            else:
                source_slug = src.name.split(":")[0].strip().lower().replace(" ", "_")[:30]

            clean_company = src.name.replace("TeamTailor: ", "").replace("Djinni: ", "").replace("DOU: ", "").split("(")[0].strip()[:200]
            
            # 1. Filter for tech jobs and exclude irrelevant non-tech roles
            candidate_entries = []
            for entry in entries:
                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                if not title or not link:
                    continue
                title_lower = title.lower()
                
                # Exclude obvious non-tech trades
                if any(ex in title_lower for ex in EXCLUDE_KEYWORDS):
                    continue
                    
                # Ensure it contains technical keywords
                if not any(k in title_lower for k in TECH_KEYWORDS):
                    continue
                    
                candidate_entries.append(entry)

            if not candidate_entries:
                continue

            # 2. Extract candidate details
            candidates = []
            for entry in candidate_entries:
                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                description = (entry.get("description") or entry.get("summary") or "").strip()
                description = re.sub(r"<[^>]+>", " ", description)
                description = re.sub(r"\s+", " ", description).strip()

                hint_parts = []
                for tag_field in ["location", "geo_location", "author", "category"]:
                    val = entry.get(tag_field)
                    if val:
                        hint_parts.append(str(val))
                for t_item in entry.get("tags", []):
                    if isinstance(t_item, dict) and t_item.get("term"):
                        hint_parts.append(str(t_item["term"]))
                    elif isinstance(t_item, str):
                        hint_parts.append(t_item)
                extra_hint = " ".join(hint_parts)

                candidate_company = clean_company
                if entry.get("author") and len(entry.get("author", "")) > 1:
                    candidate_company = entry.get("author").strip()[:200]

                # Specialized parsing for Ukrainian job boards (DOU & Djinni)
                if source_slug == "dou":
                    if " в " in title:
                        parts = title.split(" в ", 1)
                        if len(parts) == 2:
                            parsed_title = parts[0].strip()
                            comp_and_loc = parts[1].strip()
                            loc_tokens = [tok.strip() for tok in comp_and_loc.split(",") if tok.strip()]
                            if loc_tokens:
                                extracted_comp = loc_tokens[0]
                                if len(loc_tokens) > 1 and loc_tokens[1].lower() in ["inc.", "inc", "llc", "ltd"]:
                                    extracted_comp = f"{loc_tokens[0]}, {loc_tokens[1]}"
                                    extra_hint += " " + " ".join(loc_tokens[2:])
                                else:
                                    extra_hint += " " + " ".join(loc_tokens[1:])
                                candidate_company = extracted_comp
                                title = parsed_title
                    if not candidate_company or any(v in candidate_company.lower() for v in ["vacancies", "вакансії"]):
                        candidate_company = "Tech Company (via DOU)"

                elif source_slug == "djinni":
                    m_comp = re.search(r"<strong>\s*([^<]+?)\s*</strong>\s*(?:—|–|-|is\b|шукає|запрошує)", description, re.IGNORECASE)
                    if m_comp:
                        c_candidate = m_comp.group(1).replace("&nbsp;", " ").strip()
                        if 1 < len(c_candidate) < 40 and c_candidate.lower() not in ["looking", "hiring", "searching", "proud", "вакансія", "опис"]:
                            candidate_company = c_candidate
                    if not candidate_company or any(v in candidate_company.lower() for v in ["vacancies", "all tech jobs", "вакансії"]):
                        candidate_company = "Tech Company (via Djinni)"

                candidates.append({
                    "title": title,
                    "company": candidate_company,
                    "link": link,
                    "description": description,
                    "loc_hint": extra_hint,
                    "is_remote": bool(REMOTE_KEYWORD_PATTERN.search(f"{title} {extra_hint} {description}")),
                    "sal_min_direct": None,
                    "sal_max_direct": None,
                    "tags": []
                })

            # 3. Persist candidates using unified pipeline
            saved = await _persist_extracted_jobs(candidates, src, source_slug, db)
            saved_count += saved

        except Exception as e:
            logger.error(f"Error scraping ATS [{src.name}]: {e}")
            db.rollback()
            try:
                db.add(SourceLog(data_source_id=src.id, error_message=str(e)[:500]))
                db.commit()
            except Exception:
                db.rollback()

    logger.info(f"Jobs sweep finished. Saved {saved_count} tech jobs across {len(active_sources)} sources.")
    return saved_count


# Universal aliases for job ingestion
scrape_jobs = scrape_all_jobs
scrape_teamtailor_jobs = scrape_all_jobs


async def scrape_single_job_source(src: DataSource, db) -> int:
    """Convenience helper to scrape a single registered job DataSource."""
    return await scrape_all_jobs(db, source_id=src.id)

