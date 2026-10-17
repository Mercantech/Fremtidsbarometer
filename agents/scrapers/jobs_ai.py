import re
import logging
from typing import List, Dict, Any, Optional

from database.models import AIModelConfig, SystemLog
from api.schemas import JobExtractionPayload, ExtractedJob
from agents.ai_provider import analyze_with_fallback, AIProviderError
from utils.logger import get_centralized_logger

logger = get_centralized_logger("JobsAI")


async def extract_jobs_with_ai(
    raw_job_items: List[Dict[str, Any]],
    db=None
) -> Optional[List[Dict[str, Any]]]:
    """
    Stage 1: jobs_extraction.
    Sends candidate vacancies to the configured LLM (resolved from DB via AIModelConfig)
    for structured fact extraction with mandatory grounded quotations and source URLs.

    Returns list of validated job dictionaries if successful.
    Returns None if AI fails or returns invalid schema, triggering seamless fallback to regex/heuristic parsing.
    """
    if not raw_job_items:
        return []

    # 1. Resolve active AI model and fallbacks from DB
    try:
        from agents.orchestrator import get_active_model
        active_config = get_active_model(db, "jobs_extraction") if db else {"provider": "google", "model_name": "gemini-3.8-flash"}
    except Exception as e:
        logger.warning(f"Failed to query active model for jobs_extraction: {e}")
        active_config = {"provider": "google", "model_name": "gemini-3.8-flash"}

    candidates = [active_config]
    if db:
        try:
            fallback_recs = db.query(AIModelConfig).filter(
                AIModelConfig.task_type == "jobs_extraction",
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
            logger.warning(f"Could not load fallback models from DB: {e}")

    if not any(c.get("model_name") == "gemini-3.8-flash" for c in candidates):
        candidates.append({"provider": "google", "model_name": "gemini-3.8-flash"})

    # Process items in batches of up to 15
    batch_size = 15
    all_grounded_jobs = []

    for b_idx in range(0, len(raw_job_items), batch_size):
        batch = raw_job_items[b_idx:b_idx + batch_size]

        # 2. Build structured input text for the prompt
        text_blocks = []
        url_to_raw = {}
        for idx, item in enumerate(batch):
            url = item.get("url") or item.get("link") or ""
            title = item.get("title") or ""
            comp = item.get("company") or ""
            loc_hint = item.get("location_hint") or ""
            desc = item.get("description") or ""
            snippet = desc[:1500]
            url_to_raw[url] = f"{title} {comp} {loc_hint} {desc}"

            text_blocks.append(
                f"--- VACANCY #{idx+1} ---\n"
                f"URL: {url}\n"
                f"TITLE: {title}\n"
                f"COMPANY: {comp}\n"
                f"LOCATION_HINT: {loc_hint}\n"
                f"RAW_TEXT:\n{snippet}\n"
            )

        prompt = (
            "You are an expert IT Talent & Compensation Analyst.\n"
            "Your task is to extract structured tech job postings strictly from the provided raw vacancies.\n\n"
            "STRICT EXTRACTION RULES:\n"
            "1. Every extracted job MUST contain `source_url` (must exactly match one of the input URLs) and a verbatim `quote` (10-500 characters) from the raw text proving the vacancy, role, or salary.\n"
            "2. Do NOT hallucinate salaries or tech. If salary is not disclosed in the text, leave salary_min, salary_max, salary_currency as null.\n"
            "3. Normalize country to ISO-2 code (e.g. DK, UA, DE, SE, NO, US, UK, PL) or 'GLOBAL'/'REMOTE'. Normalize city if mentioned.\n"
            "4. Extract key technologies as an array of strings in `technologies`.\n"
            "5. Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "jobs": [\n'
            '    {\n'
            '      "source_url": "https://...",\n'
            '      "quote": "verbatim text excerpt from vacancy",\n'
            '      "title": "Clean Job Title",\n'
            '      "company": "Company Name",\n'
            '      "country": "DK",\n'
            '      "city": "Copenhagen",\n'
            '      "technologies": ["Python", "Docker"],\n'
            '      "seniority": "Senior",\n'
            '      "salary_min": null,\n'
            '      "salary_max": null,\n'
            '      "salary_currency": null\n'
            '    }\n'
            '  ]\n'
            "}\n\n"
            "RAW INPUT VACANCIES:\n" + "\n".join(text_blocks)
        )

        schema_instruction = 'Root JSON object with "jobs" key containing array of ExtractedJob objects.'

        try:
            result, meta = await analyze_with_fallback(candidates, prompt, schema_instruction, return_meta=True)
            if not isinstance(result, dict):
                logger.warning(f"AI jobs_extraction: Expected dict from AI model, got {type(result)}")
                return []
            payload = JobExtractionPayload(**result)

            # Grounding & citation verification: verify that quote and source_url exist in raw text
            grounded_jobs = []
            for job in payload.jobs:
                if not job.source_url or job.source_url not in url_to_raw:
                    logger.warning(f"AI jobs_extraction: Dropping job with ungrounded URL {job.source_url}")
                    continue
                if len(job.quote.strip()) < 10:
                    logger.warning(f"AI jobs_extraction: Dropping job with short quote: '{job.quote}'")
                    continue

                # Verify quote is actually present in raw input text (anti-hallucination check)
                clean_quote = re.sub(r"\s+", " ", job.quote.strip().lower())
                clean_raw = re.sub(r"\s+", " ", url_to_raw[job.source_url].lower())
                quote_sample = clean_quote[:min(25, len(clean_quote))]
                if quote_sample not in clean_raw and clean_quote not in clean_raw:
                    logger.warning(f"AI jobs_extraction: Dropping job because quote '{job.quote[:40]}' not grounded in source text.")
                    continue

                grounded_jobs.append(job.model_dump())

            all_grounded_jobs.extend(grounded_jobs)

            # Log AI token usage and cost to SystemLog
            if db:
                try:
                    sys_log = SystemLog(
                        level="INFO",
                        component="AIExtractor-jobs_extraction",
                        message=(
                            f"AI jobs_extraction succeeded with {meta.get('provider')}/{meta.get('model_name')}. "
                            f"Extracted {len(grounded_jobs)} grounded vacancies. "
                            f"Tokens: {meta.get('prompt_tokens', 0)}+{meta.get('completion_tokens', 0)} "
                            f"(${meta.get('cost_usd', 0.0):.6f})"
                        ),
                        metadata_={
                            "task_type": "jobs_extraction",
                            "model": meta.get("model_name"),
                            "provider": meta.get("provider"),
                            "prompt_tokens": meta.get("prompt_tokens", 0),
                            "completion_tokens": meta.get("completion_tokens", 0),
                            "cost_usd": meta.get("cost_usd", 0.0),
                            "fallback_used": meta.get("fallback_used", False),
                            "items_extracted": len(grounded_jobs),
                            "status": "success"
                        }
                    )
                    db.add(sys_log)
                    db.commit()
                except Exception as log_err:
                    db.rollback()
                    logger.warning(f"Failed to save AI usage log: {log_err}")

        except Exception as e:
            logger.warning(
                f"AI jobs_extraction failed: {e}. Gracefully falling back to heuristic/regex parser."
            )
            if db:
                try:
                    sys_log = SystemLog(
                        level="WARNING",
                        component="AIExtractor-jobs_extraction",
                        message=f"AI jobs_extraction failed ({e}). Falling back to heuristic/regex parser.",
                        metadata_={"task_type": "jobs_extraction", "status": "fallback", "error": str(e)}
                    )
                    db.add(sys_log)
                    db.commit()
                except Exception:
                    db.rollback()
            return None

    return all_grounded_jobs
