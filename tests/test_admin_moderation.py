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
    # Verify no Remote or pure remote entries leaked into top_cities
    for c in stats["top_cities"]:
        assert c["city"].lower() != "remote"
        assert c["city"].lower() != "hybrid"

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


def test_pins_bulk_toggle_flow():
    """Verify bulk hiding and unhiding pins."""
    res = client.post(
        "/api/admin/pins/bulk-toggle",
        json={"pin_ids": ["test-bulk-1", "test-bulk-2"], "action": "hide"},
        headers={"x-api-key": ADMIN_KEY}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "hide"
    assert data["requested_count"] == 2

    # Unhide
    unhide_res = client.post(
        "/api/admin/pins/bulk-toggle",
        json={"pin_ids": ["test-bulk-1", "test-bulk-2"], "action": "unhide"},
        headers={"x-api-key": ADMIN_KEY}
    )
    assert unhide_res.status_code == 200
    assert unhide_res.json()["action"] == "unhide"


def test_jobs_expired_count_and_bulk_operations():
    """Verify expired count and bulk delete flow."""
    # 1. Expired count query
    count_res = client.get("/api/admin/jobs/expired-count?days=30", headers={"x-api-key": ADMIN_KEY})
    assert count_res.status_code == 200
    count_data = count_res.json()
    assert "expired_count" in count_data
    assert "cutoff_date" in count_data
    assert count_data["days"] == 30

    # 2. Bulk delete (with non-existent IDs to test safe execution)
    bulk_del_res = client.post(
        "/api/admin/jobs/bulk-delete",
        json={"job_ids": [9999991, 9999992]},
        headers={"x-api-key": ADMIN_KEY}
    )
    assert bulk_del_res.status_code == 200
    bulk_data = bulk_del_res.json()
    assert bulk_data["status"] == "bulk_deleted"
    assert bulk_data["requested_count"] == 2

