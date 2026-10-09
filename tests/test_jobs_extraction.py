import pytest
from unittest.mock import patch, AsyncMock
from pydantic import ValidationError

from api.schemas import ExtractedJob, JobExtractionPayload, GroundedFact
from agents.ai_provider import calculate_token_cost, AIProviderError
from agents.scrapers.jobs_scraper import extract_jobs_with_ai


def test_job_extraction_schema_valid():
    """Verify that valid ExtractedJob conforms to GroundedFact contract."""
    job = ExtractedJob(
        source_url="https://company.teamtailor.com/jobs/123-senior-python",
        quote="We offer 65,000 - 85,000 EUR with hybrid work in Berlin.",
        title="Senior Python Backend Engineer",
        company="Enterprise Tech GmbH",
        country="DE",
        city="Berlin",
        technologies=["Python", "FastAPI", "PostgreSQL", "Docker"],
        seniority="Senior",
        salary_min=65000.0,
        salary_max=85000.0,
        salary_currency="EUR"
    )
    assert job.source_url.startswith("https://")
    assert len(job.quote) >= 10
    assert job.country == "DE"
    assert job.salary_min == 65000.0
    assert "Python" in job.technologies

    payload = JobExtractionPayload(jobs=[job])
    assert len(payload.jobs) == 1
    assert payload.jobs[0].title == "Senior Python Backend Engineer"


def test_job_extraction_schema_invalid_short_quote():
    """Verify that quote < 10 characters raises validation error."""
    with pytest.raises(ValidationError) as exc_info:
        ExtractedJob(
            source_url="https://example.com/job/1",
            quote="short",  # < 10 characters
            title="Frontend Dev",
            company="Startup",
            country="UA"
        )
    assert "quote" in str(exc_info.value)


def test_job_extraction_schema_missing_url():
    """Verify that missing source_url raises validation error."""
    with pytest.raises(ValidationError) as exc_info:
        ExtractedJob(
            quote="We are looking for a Senior React Developer in Kyiv.",
            title="Frontend Dev",
            company="Startup",
            country="UA"
        )
    assert "source_url" in str(exc_info.value)


def test_token_pricing_calculation():
    """Verify cost calculation across different provider models."""
    # Gemini 3.8 Flash: $0.075/1M input, $0.30/1M output
    cost_gemini = calculate_token_cost("gemini-3.8-flash", 1000, 500)
    expected_gemini = round((1000 * (0.075 / 1_000_000)) + (500 * (0.30 / 1_000_000)), 6)
    assert pytest.approx(cost_gemini, rel=1e-5) == expected_gemini

    # GPT-4o-mini: $0.15/1M input, $0.60/1M output
    cost_gpt = calculate_token_cost("gpt-4o-mini", 2000, 1000)
    expected_gpt = (2000 / 1_000_000) * 0.15 + (1000 / 1_000_000) * 0.60
    assert pytest.approx(cost_gpt, rel=1e-5) == expected_gpt

    # Unknown model falls back to default pricing
    cost_unknown = calculate_token_cost("unknown-experimental-model", 1000, 500)
    assert cost_unknown > 0.0


@pytest.mark.asyncio
async def test_extract_jobs_with_ai_grounding_verification():
    """
    Verify that extract_jobs_with_ai verifies source URLs and verbatim quotes against input raw text.
    Hallucinated URLs or made-up quotes must be dropped.
    """
    input_items = [
        {
            "url": "https://jobs.example.com/dk-python",
            "title": "Senior Python Developer",
            "company": "Nordic Tech ApS",
            "location_hint": "Copenhagen, Denmark",
            "description": "Nordic Tech ApS is seeking a Senior Python Developer in Copenhagen. Salary is 65000 DKK per month."
        },
        {
            "url": "https://jobs.example.com/ua-react",
            "title": "React Frontend Engineer",
            "company": "Kyiv Digital",
            "location_hint": "Kyiv, Ukraine",
            "description": "Kyiv Digital is looking for a React Frontend Engineer based in Kyiv. Hybrid mode."
        }
    ]

    mock_llm_response = {
        "jobs": [
            # 1. Valid and grounded
            {
                "source_url": "https://jobs.example.com/dk-python",
                "quote": "seeking a Senior Python Developer in Copenhagen. Salary is 65000 DKK",
                "title": "Senior Python Developer",
                "company": "Nordic Tech ApS",
                "country": "DK",
                "city": "Copenhagen",
                "technologies": ["Python"],
                "seniority": "Senior",
                "salary_min": 65000.0,
                "salary_max": 65000.0,
                "salary_currency": "DKK"
            },
            # 2. Ungrounded URL (never existed in input batch) -> Must be dropped
            {
                "source_url": "https://fake-hallucinated-jobs.com/999",
                "quote": "Fake quote about software development in Berlin",
                "title": "Hallucinated Dev",
                "company": "Ghost Corp",
                "country": "DE"
            },
            # 3. Valid URL but hallucinated quote not present in input raw text -> Must be dropped
            {
                "source_url": "https://jobs.example.com/ua-react",
                "quote": "We pay 150000 USD and provide free trips to Hawaii",  # not in input text!
                "title": "React Frontend Engineer",
                "company": "Kyiv Digital",
                "country": "UA"
            }
        ]
    }
    mock_meta = {
        "provider": "google",
        "model_name": "gemini-3.8-flash",
        "prompt_tokens": 500,
        "completion_tokens": 150,
        "cost_usd": 0.000165,
        "fallback_used": False
    }

    with patch("agents.scrapers.jobs_scraper.analyze_with_fallback", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = (mock_llm_response, mock_meta)

        results = await extract_jobs_with_ai(input_items, db=None)

        assert results is not None
        # Only the 1 grounded vacancy must be kept
        assert len(results) == 1
        assert results[0]["source_url"] == "https://jobs.example.com/dk-python"
        assert results[0]["country"] == "DK"
        assert results[0]["salary_currency"] == "DKK"
        assert results[0]["salary_min"] == 65000.0


@pytest.mark.asyncio
async def test_extract_jobs_with_ai_fallback_on_error():
    """Verify that when AI provider fails or raises AIProviderError, it returns None gracefully."""
    input_items = [
        {
            "url": "https://jobs.example.com/test",
            "title": "Software Engineer",
            "company": "Tech",
            "location_hint": "Remote",
            "description": "Hiring software engineer."
        }
    ]

    with patch("agents.scrapers.jobs_scraper.analyze_with_fallback", new_callable=AsyncMock) as mock_ai:
        mock_ai.side_effect = AIProviderError("All AI candidate models failed (quota exceeded).")

        result = await extract_jobs_with_ai(input_items, db=None)

        # Must return None so callers fall back seamlessly to regex/heuristic parser
        assert result is None
