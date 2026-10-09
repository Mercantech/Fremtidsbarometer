import os
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")


def test_pins_moderation_flow():
    """Verify listing pins, pagination, hiding a pin and restoring pins."""
    # 1. List pins
    res = client.get("/api/admin/pins?page=1&limit=10", headers={"x-api-key": ADMIN_KEY})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "hidden_count" in data
    assert "total_pages" in data

    # 2. Toggle hide on a dummy pin
    toggle_res = client.post("/api/admin/pins/test-pin-999/toggle-hide", headers={"x-api-key": ADMIN_KEY})
    assert toggle_res.status_code == 200
    t_data = toggle_res.json()
    assert t_data["id"] == "test-pin-999"
    assert t_data["is_hidden"] is True

    # 3. Toggle hide again (unhide)
    toggle_back = client.post("/api/admin/pins/test-pin-999/toggle-hide", headers={"x-api-key": ADMIN_KEY})
    assert toggle_back.status_code == 200
    assert toggle_back.json()["is_hidden"] is False


def test_jobs_inspector_flow():
    """Verify jobs listing, filters, and statistics."""
    # 1. Stats
    stats_res = client.get("/api/admin/jobs/stats", headers={"x-api-key": ADMIN_KEY})
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_jobs" in stats
    assert "danish_jobs" in stats
    assert "danish_focus_regions" in stats
    assert "top_cities" in stats

    # 2. Listing
    jobs_res = client.get("/api/admin/jobs?page=1&limit=5", headers={"x-api-key": ADMIN_KEY})
    assert jobs_res.status_code == 200
    jobs_data = jobs_res.json()
    assert "items" in jobs_data
    assert "total" in jobs_data
    assert isinstance(jobs_data["items"], list)


def test_scheduler_jobs_api():
    """Verify scheduler job management endpoints from pipeline router."""
    res = client.get("/api/admin/scheduler/jobs", headers={"x-api-key": ADMIN_KEY})
    assert res.status_code == 200
    data = res.json()
    assert "jobs" in data
    assert "scheduler_running" in data
    assert isinstance(data["jobs"], list)
    if len(data["jobs"]) > 0:
        first = data["jobs"][0]
        assert "id" in first
        assert "name" in first
