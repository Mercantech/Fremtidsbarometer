import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from api.main import app
from database.models import JobPosting
from database.session import engine, SessionLocal
from database.init_db import ensure_database_schema
from api.services.job_scoring import (
    calculate_job_hype_score,
    enrich_job_posting,
    _contains_keyword
)

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    ensure_database_schema(engine)
    db = SessionLocal()
    # Clean up test-specific job titles if any exist
    db.query(JobPosting).filter(
        JobPosting.title.in_([
            "Senior AI Agent Engineer (LLM / RAG)",
            "WordPress Maintenance Developer"
        ])
    ).delete(synchronize_session=False)
    db.commit()

    now = datetime.now(timezone.utc)
    hot_job = JobPosting(
        title="Senior AI Agent Engineer (LLM / RAG)",
        company="NeuroTech AI",
        country="DK",
        city="Copenhagen",
        technology="Python",
        tags=["AI", "LLM", "RAG", "PyTorch"],
        salary_min=120000,
        salary_max=150000,
        salary_currency="USD",
        status="published",
        date=now - timedelta(hours=3),
    )
    regular_job = JobPosting(
        title="WordPress Maintenance Developer",
        company="OldWeb Ltd",
        country="DK",
        city="Aarhus",
        technology="PHP",
        tags=["PHP", "WordPress", "MySQL"],
        salary_min=None,
        salary_max=None,
        salary_currency=None,
        status="published",
        date=now - timedelta(days=20),
    )
    db.add(hot_job)
    db.add(regular_job)
    db.commit()
    db.close()

    yield

    db = SessionLocal()
    db.query(JobPosting).filter(
        JobPosting.title.in_([
            "Senior AI Agent Engineer (LLM / RAG)",
            "WordPress Maintenance Developer"
        ])
    ).delete(synchronize_session=False)
    db.commit()
    db.close()


def test_keyword_boundary_matching():
    # 'ai' must not trigger inside 'chair', 'email', 'gain'
    assert _contains_keyword("office chair maintenance", "ai") is False
    assert _contains_keyword("email marketing lead", "ai") is False
    assert _contains_keyword("Senior AI Engineer", "ai") is True
    assert _contains_keyword("Lead ML Specialist", "ml") is True


def test_hot_job_scoring():
    now = datetime.now(timezone.utc)
    score, is_hot = calculate_job_hype_score(
        title="Autonomous AI Agent Developer",
        technology="Python",
        tags=["LLM", "LangChain", "CUDA"],
        salary_min=130000,
        salary_max=160000,
        salary_currency="USD",
        date=now - timedelta(hours=6),
        now=now,
    )
    # Tech match (+0.40) + Salary premium (+0.35) + Freshness (+0.25) = 1.0
    assert score >= 0.85
    assert is_hot is True


def test_cold_job_scoring():
    now = datetime.now(timezone.utc)
    score, is_hot = calculate_job_hype_score(
        title="Legacy HTML/CSS Editor",
        technology="HTML",
        tags=["HTML", "CSS"],
        salary_min=None,
        salary_max=None,
        salary_currency=None,
        date=now - timedelta(days=30),
        now=now,
    )
    assert score == 0.0
    assert is_hot is False


def test_dkk_high_salary_scoring():
    now = datetime.now(timezone.utc)
    score, is_hot = calculate_job_hype_score(
        title="Rust Core Systems Architect",
        technology="Rust",
        salary_min=750000,
        salary_max=850000,
        salary_currency="DKK",
        date=now - timedelta(hours=20),
        now=now,
    )
    # Tech match (+0.25) + Salary (+0.35) + Freshness (+0.25) = 0.85
    assert score >= 0.70
    assert is_hot is True


def test_enrich_job_posting_dict():
    now = datetime.now(timezone.utc)
    job_dict = {
        "title": "LLM Research Scientist",
        "technology": "PyTorch",
        "salary_min": 140000,
        "salary_currency": "USD",
        "date": now - timedelta(hours=1),
    }
    enriched = enrich_job_posting(job_dict, now=now)
    assert "hype_score" in enriched
    assert "is_hot" in enriched
    assert enriched["is_hot"] is True
    assert enriched["hype_score"] >= 0.70


def test_api_jobs_returns_scoring_fields():
    response = client.get("/api/jobs")
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) >= 2
    for job in jobs:
        assert "hype_score" in job
        assert "is_hot" in job

    # Test sorting by hype
    response_sorted = client.get("/api/jobs?sort_by_hype=true&limit=20")
    assert response_sorted.status_code == 200
    jobs_sorted = response_sorted.json()
    assert len(jobs_sorted) >= 2
    assert jobs_sorted[0]["hype_score"] >= jobs_sorted[1]["hype_score"]

    # Test only hot filter
    response_hot = client.get("/api/jobs?only_hot=true&limit=20")
    assert response_hot.status_code == 200
    jobs_hot = response_hot.json()
    for j in jobs_hot:
        assert j["is_hot"] is True
