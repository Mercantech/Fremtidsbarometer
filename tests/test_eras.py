import pytest
from fastapi.testclient import TestClient
from api.main import app
from database.models import Era
from database.seeds.eras import ERAS_SEED, seed_eras
from database.session import get_session

client = TestClient(app)

@pytest.fixture(autouse=True, scope="module")
def setup_db():
    from database.session import engine
    from database.init_db import ensure_database_schema
    ensure_database_schema(engine)

def test_eras_seed_structure():
    """Verify all 8 eras have complete bilingual content, milestones, and chronicles."""
    assert len(ERAS_SEED) >= 8
    years = [e["year"] for e in ERAS_SEED]
    assert 1964 in years
    assert 1972 in years
    assert 1981 in years
    assert 1995 in years
    assert 2008 in years
    assert 2018 in years
    assert 2026 in years
    assert 2035 in years

    for era in ERAS_SEED:
        assert era["title"], f"Missing title for year {era['year']}"
        assert era["subtitle"], f"Missing subtitle for year {era['year']}"
        stats = era.get("stats", {})
        assert stats.get("title_da"), f"Missing Danish title for year {era['year']}"
        assert stats.get("tagline"), f"Missing tagline for year {era['year']}"
        assert stats.get("tagline_da"), f"Missing Danish tagline for year {era['year']}"
        assert stats.get("icon"), f"Missing icon for year {era['year']}"
        assert len(stats.get("roles", [])) >= 4, f"Insufficient roles for year {era['year']}"
        assert len(stats.get("stack", [])) >= 4, f"Insufficient stack for year {era['year']}"
        assert len(stats.get("milestones", [])) >= 3, f"Missing milestones for year {era['year']}"
        assert len(stats.get("chronicle", [])) >= 3, f"Missing chronicle for year {era['year']}"

def test_eras_api_endpoint():
    """Verify GET /api/eras returns all enriched historical eras."""
    session = get_session()
    try:
        seed_eras(session)
    finally:
        session.close()

    response = client.get("/api/eras")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8
    
    first = data[0]
    assert first["year"] == 1964
    assert first["stats"]["title_da"] == "Hovedrammer & Hulkort"
    assert "chronicle" in first["stats"]
    assert len(first["stats"]["chronicle"]) >= 3
