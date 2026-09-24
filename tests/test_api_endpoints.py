import os
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "Fremtidsbarometer API" in response.json()["message"]

def test_trends_endpoint():
    response = client.get("/api/trends?country=GLOBAL&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "technology" in item
        assert "popularity" in item

def test_trends_history_endpoint():
    response = client.get("/api/trends/history?country=GLOBAL&start_year=1995&end_year=2026")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        year_entry = data[0]
        assert "year" in year_entry
        assert "data" in year_entry
        assert isinstance(year_entry["data"], list)

def test_news_endpoint():
    response = client.get("/api/news?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_jobs_endpoint():
    response = client.get("/api/jobs?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        job = data[0]
        assert "title" in job
        assert "technology" in job
        assert "tags" in job
        # Verify tech jobs are not tagged as non-tech roles
        for j in data:
            assert "driver" not in j["title"].lower()
            assert "warehouse" not in j["title"].lower()

def test_salary_endpoint_dk():
    response = client.get("/api/salary?country=DK")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    item = data[0]
    assert "technology" in item
    assert "median" in item
    assert item["median"] > 0

def test_salary_endpoint_us():
    response = client.get("/api/salary?country=US")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_countries_endpoint():
    response = client.get("/api/countries")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Check that both GLOBAL and regional countries are present
    assert "GLOBAL" in data
    for expected in ["DK", "SE", "US"]:
        assert expected in data

def test_eras_endpoint():
    response = client.get("/api/eras")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    era_years = [e["year"] for e in data]
    assert 2026 in era_years

def test_admin_status_unauthorized():
    response = client.get("/api/admin/status")
    assert response.status_code == 401

def test_admin_status_authorized():
    admin_key = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")
    response = client.get("/api/admin/status", headers={"x-api-key": admin_key})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "freshness" in data
    assert "is_fresh" in data["freshness"]

