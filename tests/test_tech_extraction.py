import pytest
import re
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock
from pydantic import ValidationError

from api.schemas import ExtractedTechSignal, TechExtractionPayload, GroundedFact
from agents.ai_provider import AIProviderError
from agents.scrapers.tech_scraper import extract_tech_signals_with_ai
from database.session import SessionLocal
from database.models import TechTrend, SystemLog, RawScrapeData


def test_tech_extraction_schema_valid():
    """Verify that valid ExtractedTechSignal conforms to GroundedFact contract."""
    signal = ExtractedTechSignal(
        source_url="https://news.ycombinator.com/item?id=4001",
        quote="Rust 1.85 stabilized async closures and improved compilation speed by 15%.",
        technology="Rust",
        signal_type="new_release",
        context_summary="Stabilized async closures and improved compiler optimization speed.",
        sentiment="positive"
    )
    assert signal.source_url.startswith("https://")
    assert len(signal.quote) >= 10
    assert signal.technology == "Rust"
    assert signal.signal_type == "new_release"
    assert signal.sentiment == "positive"

    payload = TechExtractionPayload(signals=[signal])
    assert len(payload.signals) == 1
    assert payload.signals[0].technology == "Rust"


def test_tech_extraction_schema_invalid_short_quote():
    """Verify that quote < 10 characters raises validation error."""
    with pytest.raises(ValidationError) as exc_info:
        ExtractedTechSignal(
            source_url="https://github.com/vllm-project/vllm",
            quote="short",  # < 10 characters
            technology="vLLM",
            signal_type="rising_popularity",
            context_summary="High-throughput LLM serving library",
            sentiment="positive"
        )
    assert "quote" in str(exc_info.value)


def test_tech_extraction_schema_missing_url():
    """Verify that missing source_url raises validation error."""
    with pytest.raises(ValidationError) as exc_info:
        ExtractedTechSignal(
            quote="FastAPI 0.110 adds native support for Pydantic v2 recursive models.",
            technology="FastAPI",
            signal_type="new_release",
            context_summary="New release with Pydantic v2 recursive models support",
            sentiment="positive"
        )
    assert "source_url" in str(exc_info.value)


@pytest.mark.asyncio
async def test_extract_tech_signals_with_ai_grounding_verification():
    """
    Verify that extract_tech_signals_with_ai enforces strict anti-hallucination rules:
    - Hallucinated URLs are dropped.
    - Hallucinated quotes not present in raw text are dropped.
    - Short quotes (< 10 chars) are dropped.
    - Only verbatim grounded quotes and URLs are kept.
    """
    input_items = [
        {
            "url": "https://news.ycombinator.com/item?id=4001",
            "title": "Rust 1.85 released",
            "text": "Rust 1.85 is out today. It stabilized async closures and improved compilation speed by 15%."
        },
        {
            "url": "https://github.com/vllm-project/vllm",
            "title": "vLLM",
            "text": "vLLM is a high-throughput and memory-efficient LLM serving engine using PagedAttention."
        }
    ]

    mock_llm_response = {
        "signals": [
            # 1. Valid & Grounded
            {
                "source_url": "https://news.ycombinator.com/item?id=4001",
                "quote": "stabilized async closures and improved compilation speed",
                "technology": "Rust",
                "signal_type": "new_release",
                "context_summary": "Rust 1.85 stabilized async closures and boosted compilation speed",
                "sentiment": "positive"
            },
            # 2. Ungrounded URL (hallucinated source_url)
            {
                "source_url": "https://hallucinated-source.org/post/999",
                "quote": "Some fake quote from a website never given in the input",
                "technology": "Zig",
                "signal_type": "rising_popularity",
                "context_summary": "Increasing adoption of Zig programming language",
                "sentiment": "neutral"
            },
            # 3. Valid URL but hallucinated quote (not in source text)
            {
                "source_url": "https://github.com/vllm-project/vllm",
                "quote": "vLLM was voted the best database management system of all time",  # not in input text!
                "technology": "vLLM",
                "signal_type": "rising_popularity",
                "context_summary": "vLLM claimed as best database system",
                "sentiment": "positive"
            }
        ]
    }
    mock_meta = {
        "provider": "google",
        "model_name": "gemini-3.8-flash",
        "prompt_tokens": 400,
        "completion_tokens": 120,
        "cost_usd": 0.000066,
        "fallback_used": False
    }

    with patch("agents.scrapers.tech_scraper.analyze_with_fallback", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = (mock_llm_response, mock_meta)

        results = await extract_tech_signals_with_ai(input_items, db=None)

        assert results is not None
        # Only the 1 grounded signal must survive
        assert len(results) == 1
        assert results[0]["technology"] == "Rust"
        assert results[0]["source_url"] == "https://news.ycombinator.com/item?id=4001"
        assert results[0]["signal_type"] == "new_release"
        assert results[0]["sentiment"] == "positive"


@pytest.mark.asyncio
async def test_extract_tech_signals_with_ai_fallback_on_error():
    """Verify that when AI provider fails, extract_tech_signals_with_ai handles it gracefully and returns None."""
    input_items = [
        {
            "url": "https://news.ycombinator.com/item?id=5001",
            "title": "Python 3.13 free threading discussion",
            "text": "Discussion on nogil / free-threaded build in Python 3.13."
        }
    ]

    with patch("agents.scrapers.tech_scraper.analyze_with_fallback", new_callable=AsyncMock) as mock_ai:
        mock_ai.side_effect = AIProviderError("AI quota exceeded for all candidate models.")

        result = await extract_tech_signals_with_ai(input_items, db=None)

        # Must return None or empty list, not crash
        assert result is None


@pytest.mark.asyncio
async def test_extract_tech_signals_with_ai_persists_trends_and_logs():
    """
    Verify that when db is provided, extract_tech_signals_with_ai:
    - Persists extracted grounded signals to TechTrend table
    - Emits a SystemLog with component 'AIExtractor-tech_extraction'
    """
    db = SessionLocal()
    unique_tech = f"TestFramework-{int(datetime.now(timezone.utc).timestamp())}"
    source_url = f"https://news.ycombinator.com/item?id=test-{unique_tech}"
    raw_text = f"Introducing {unique_tech}, a zero-latency streaming framework for modern web services."

    input_items = [
        {
            "url": source_url,
            "title": f"Show HN: {unique_tech}",
            "text": raw_text
        }
    ]

    mock_llm_response = {
        "signals": [
            {
                "source_url": source_url,
                "quote": f"zero-latency streaming framework for modern web services",
                "technology": unique_tech,
                "signal_type": "new_release",
                "context_summary": f"Launch of {unique_tech} high-speed streaming framework",
                "sentiment": "positive"
            }
        ]
    }
    mock_meta = {
        "provider": "google",
        "model_name": "gemini-3.8-flash",
        "prompt_tokens": 300,
        "completion_tokens": 80,
        "cost_usd": 0.000045,
        "fallback_used": False
    }

    try:
        with patch("agents.scrapers.tech_scraper.analyze_with_fallback", new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = (mock_llm_response, mock_meta)

            results = await extract_tech_signals_with_ai(input_items, db=db)

            assert results is not None
            assert len(results) == 1
            assert results[0]["technology"] == unique_tech

            # Verify TechTrend record exists in DB
            trend = db.query(TechTrend).filter(
                TechTrend.technology == unique_tech,
                TechTrend.country == "GLOBAL",
                TechTrend.source == "tech_signal"
            ).first()
            assert trend is not None
            assert trend.popularity >= 50.0
            assert trend.mentions >= 1
            assert "signals" in (trend.metadata_ or {})

            # Verify SystemLog was emitted
            log_entry = db.query(SystemLog).filter(
                SystemLog.component == "AIExtractor-tech_extraction"
            ).order_by(SystemLog.id.desc()).first()
            assert log_entry is not None
            assert log_entry.level == "INFO"
            assert "tech_extraction succeeded" in log_entry.message

    finally:
        # Cleanup
        db.query(TechTrend).filter(TechTrend.technology == unique_tech).delete()
        db.commit()
        db.close()
