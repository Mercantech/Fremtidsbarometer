import asyncio
import logging
import json
import re
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from database.models import RawScrapeData, HypeAnalysis, Era, SystemLog, TechTrend
from agents.ai_provider import get_ai_provider, AIProviderError
from utils.logger import get_centralized_logger

logger = get_centralized_logger("Synthesizer")

async def run_mathematical_synthesis(db, model_config: Dict[str, str] = None) -> List[Dict[str, Any]]:
    """
    Synthesizer (Run 4):
    1. Aggregates all raw discussion dumps from raw_scrape_data (Reddit, HN, GitHub, Jobs).
    2. Uses LLM for Semantic Topic Clustering (extracting concrete, high-nuance debates).
    3. Computes deterministic mathematical share (% of posts discussing the topic).
    4. Computes direction ('rising', 'falling', 'stable') compared to previous period.
    5. Saves to HypeAnalysis and updates current Era.
    """
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    lookback_window = today - timedelta(days=4)
    
    # 1. Fetch raw items from DB
    raw_records = db.query(RawScrapeData).filter(
        RawScrapeData.created_at >= lookback_window
    ).order_by(RawScrapeData.created_at.desc()).limit(150).all()
    
    total_posts = len(raw_records)
    if total_posts < 3:
        logger.warning(f"Too few raw scrape records ({total_posts}) for statistical synthesis.")
        return []

    logger.info(f"Synthesizing {total_posts} raw discussion threads from the past 4 days...")

    # 2. Build condensed context for LLM clustering
    context_snippets = []
    for idx, r in enumerate(raw_records[:80]):
        # Extract title and top lines
        snippet = r.raw_text.strip()[:600]
        context_snippets.append(f"[{idx+1}] {snippet}")
        
    aggregated_context = "\n---\n".join(context_snippets)

    # 3. Prompt for Semantic Topic Clustering
    prompt = f"""
    Analyze the following {len(context_snippets)} real discussion threads, developer posts, and tech news from the past 4 days:
    
    {aggregated_context[:18000]}
    
    Your task is to identify 4 to 6 CONCRETE, HIGH-NUANCE TOPICS that developers and IT sources are actively discussing.
    Do NOT output generic single words like "AI" or "Python". Identify the specific ongoing debate, problem, or paradigm shift.
    Examples of good topics:
    - "AI Code Hallucinations & Regressions"
    - "Autonomous Agent Sandboxing & Vulnerabilities"
    - "Enterprise Rust Migration Bottlenecks"
    - "Junior Developer Hiring Transformation"
    - "Post-Quantum Cryptography Adoption"

    For each topic, provide:
    1. topic: Short title in English (2-4 words).
    2. summary: Exactly 2 sentences in English explaining what specific challenges or debates are occurring.
    3. keywords: A list of 4-6 lowercase keywords/phrases strongly associated with this topic (for frequency counting).

    ALL OUTPUT MUST BE IN ENGLISH.
    """

    schema = """
    JSON Format:
    {
      "clusters": [
        {
          "topic": "AI Code Hallucinations & Regressions",
          "summary": "Developers report increasing difficulty in catching subtle logic bugs introduced by automated code generation tools. Teams are introducing stricter sandboxed evaluation and unit-testing gates.",
          "keywords": ["hallucination", "regression", "code generation", "copilot bug", "logic error"]
        }
      ]
    }
    """

    provider_name = model_config.get("provider", "google") if model_config else "google"
    model_name = model_config.get("model_name", "gemini-2.5-pro") if model_config else "gemini-2.5-pro"
    ai = get_ai_provider(provider=provider_name, model_name=model_name)
    
    try:
        result = await ai.analyze_json(prompt, schema)
    except AIProviderError as e:
        logger.error(f"Synthesizer AI clustering failed: {e}")
        raise e

    clusters = result.get("clusters", [])
    if not clusters:
        logger.warning("No clusters returned by Synthesizer LLM.")
        return []

    logger.info(f"AI extracted {len(clusters)} topic clusters. Computing deterministic mathematical shares...")

    # 4. Deterministic Python Mathematical Share & Direction Calculation
    synthesized_results = []
    
    # Fetch previous hype entries for trend delta
    previous_entries = db.query(HypeAnalysis).filter(
        HypeAnalysis.date < today
    ).order_by(HypeAnalysis.date.desc()).limit(10).all()
    
    prev_score_map = {p.topic.lower(): p.score for p in previous_entries}

    for cluster in clusters:
        topic = cluster.get("topic", "").strip()
        summary = cluster.get("summary", "").strip()
        keywords = [k.lower() for k in cluster.get("keywords", []) if isinstance(k, str)]
        
        if not topic or not summary:
            continue

        # Count occurrences in raw text
        matched_posts = 0
        for r in raw_records:
            r_lower = r.raw_text.lower()
            if any(kw in r_lower for kw in keywords) or topic.lower() in r_lower:
                matched_posts += 1
                
        # Calculate mathematical share percentage (min 15% for relevance, max 100%)
        calculated_share = round((matched_posts / max(total_posts, 1)) * 100, 1)
        # Normalize to 0-100 scale with a boost for statistical relevance
        normalized_score = min(100.0, max(20.0, calculated_share * 2.5))

        # Calculate direction delta compared to previous run
        prev_score = prev_score_map.get(topic.lower())
        if prev_score is not None:
            delta = normalized_score - prev_score
            if delta > 4.0:
                direction = "rising"
            elif delta < -4.0:
                direction = "falling"
            else:
                direction = "stable"
        else:
            # If new topic with high share, mark rising
            direction = "rising" if normalized_score > 60 else "stable"

        # Save to HypeAnalysis
        existing_hype = db.query(HypeAnalysis).filter(
            HypeAnalysis.date == today,
            HypeAnalysis.topic == topic
        ).first()

        if existing_hype:
            existing_hype.score = normalized_score
            existing_hype.direction = direction
            existing_hype.summary = summary
        else:
            new_hype = HypeAnalysis(
                date=today,
                topic=topic[:200],
                score=normalized_score,
                direction=direction,
                summary=summary,
                status="published",
                sources=["reddit", "hackernews", "github", "teamtailor"]
            )
            db.add(new_hype)

        synthesized_results.append({
            "topic": topic,
            "score": normalized_score,
            "direction": direction,
            "summary": summary,
            "matched_posts": matched_posts,
            "total_posts": total_posts
        })

    # 5. Update current active Era stats with top trending topic
    if synthesized_results:
        # Sort by score desc
        top_topic = sorted(synthesized_results, key=lambda x: x["score"], reverse=True)[0]
        current_year = datetime.now(timezone.utc).year
        current_era = db.query(Era).filter(Era.year <= current_year).order_by(Era.year.desc()).first()
        
        if current_era and current_era.stats:
            updated_stats = dict(current_era.stats)
            updated_stats["hypeTopic"] = top_topic["topic"]
            updated_stats["hypeDesc"] = top_topic["summary"]
            current_era.stats = updated_stats
            logger.info(f"Updated Era {current_era.year} with Top Hype Topic: '{top_topic['topic']}'")

    # 6. Dynamically update TechTrend table with real developer mention frequencies
    tracked_techs = [
        ("Python", "Language"),
        ("TypeScript", "Language"),
        ("JavaScript", "Language"),
        ("Rust", "Language"),
        ("Go", "Language"),
        ("Java", "Language"),
        ("C++", "Language"),
        ("C#", "Language"),
        ("React", "Framework"),
        ("Vue", "Framework"),
        ("Next.js", "Framework"),
        ("Docker", "Cloud/DevOps"),
        ("Kubernetes", "Cloud/DevOps"),
        ("PostgreSQL", "Database"),
        ("PyTorch", "AI/ML"),
        ("Linux", "Cloud/DevOps"),
        ("AWS", "Cloud/DevOps"),
        ("Git", "Tool")
    ]
    
    all_texts_joined = " ".join(r.raw_text for r in raw_records).lower()
    existing_trends = {
        t.technology: t for t in db.query(TechTrend).filter(
            TechTrend.country == "GLOBAL",
            TechTrend.source == "aggregated",
            TechTrend.date == today
        ).all()
    }

    for tech, category in tracked_techs:
        pattern = re.compile(rf"\b{re.escape(tech.lower())}\b")
        mentions_count = len(pattern.findall(all_texts_joined))
        
        # Calculate popularity 15% - 99% based on mention density
        ratio = mentions_count / max(total_posts, 1)
        popularity = min(99.0, max(20.0, round(25.0 + ratio * 80.0, 1)))
        
        existing_trend = existing_trends.get(tech)
        if existing_trend:
            existing_trend.popularity = popularity
            existing_trend.mentions = mentions_count
            existing_trend.metadata_ = {"category": category}
        else:
            db.add(TechTrend(
                technology=tech,
                popularity=popularity,
                mentions=mentions_count,
                source="aggregated",
                country="GLOBAL",
                date=today,
                status="published",
                metadata_={"category": category}
            ))

    # 7. Bulk mark raw records as processed (1 fast query instead of 150 individual updates)
    if raw_records:
        raw_ids = [r.id for r in raw_records]
        db.query(RawScrapeData).filter(RawScrapeData.id.in_(raw_ids)).update(
            {RawScrapeData.processed: 1}, synchronize_session=False
        )

    db.commit()
    logger.info(f"Successfully synthesized {len(synthesized_results)} hype topics and updated TechTrends.")
    return synthesized_results
