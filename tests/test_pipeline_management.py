import pytest
from fastapi.testclient import TestClient
from api.main import app
from database.session import get_session
from database.models import PipelineExecution
from datetime import datetime, timezone

import os
client = TestClient(app)
admin_key = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")
ADMIN_HEADERS = {"x-api-key": admin_key}


def test_pipeline_executions_endpoint():
    # Insert a test execution in DB
    db = get_session()
    test_id = "test-pipe-123"
    db.query(PipelineExecution).filter(PipelineExecution.id == test_id).delete()
    
    rec = PipelineExecution(
        id=test_id,
        sweep="social",
        trigger_type="manual",
        status="completed",
        current_step="Completed successfully",
        force=0,
        started_at=datetime.now(timezone.utc),
        finished_at=datetime.now(timezone.utc),
        duration_sec=12.4
    )
    db.add(rec)
    db.commit()
    db.close()

    res = client.get("/api/admin/executions", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "active_execution" in data
    assert "recent_executions" in data
    assert any(r["id"] == test_id for r in data["recent_executions"])


def test_scheduler_jobs_management():
    # 1. Fetch scheduled jobs
    res = client.get("/api/admin/scheduler/jobs", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "jobs" in data
    assert len(data["jobs"]) >= 6

    # 2. Pause a job
    res_pause = client.post("/api/admin/scheduler/jobs/live_news_feed_job/pause", headers=ADMIN_HEADERS)
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "paused"

    # 3. Resume a job
    res_resume = client.post("/api/admin/scheduler/jobs/live_news_feed_job/resume", headers=ADMIN_HEADERS)
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "resumed"

    # 4. Update interval
    res_interval = client.post(
        "/api/admin/scheduler/jobs/live_news_feed_job/update-interval",
        headers=ADMIN_HEADERS,
        json={"interval_minutes": 30}
    )
    assert res_interval.status_code == 200
    assert res_interval.json()["interval_minutes"] == 30

    # 5. Toggle scheduler pause & resume
    res_toggle1 = client.post("/api/admin/scheduler/toggle", headers=ADMIN_HEADERS)
    assert res_toggle1.status_code == 200
    assert res_toggle1.json()["status"] in ["started", "paused", "resumed"]

    res_toggle2 = client.post("/api/admin/scheduler/toggle", headers=ADMIN_HEADERS)
    assert res_toggle2.status_code == 200
