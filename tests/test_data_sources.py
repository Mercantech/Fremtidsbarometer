import os
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")
AUTH_HEADERS = {"x-api-key": ADMIN_KEY}


def test_data_sources_unauthorized():
    response = client.get("/api/admin/data-sources")
    assert response.status_code == 401


def test_data_sources_list():
    response = client.get("/api/admin/data-sources", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_create_and_duplicate_salary_api_source():
    # 1. Create a new unique Salary API source
    unique_url = "https://test-salary-board.example.com/api/v1/salaries"
    payload = {
        "name": "Test Salary API",
        "url": f"  {unique_url}/  ",  # with whitespace and trailing slash to test normalization
        "category": "salary",
        "source_type": "api",
        "is_active": 1,
    }
    create_resp = client.post("/api/admin/data-sources", json=payload, headers=AUTH_HEADERS)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["name"] == "Test Salary API"
    assert created["url"] == unique_url
    assert created["category"] == "salary"
    assert created["source_type"] == "api"
    source_id = created["id"]

    try:
        # 2. Attempt to create the exact duplicate -> must return 400 with descriptive detail
        dup_resp = client.post("/api/admin/data-sources", json=payload, headers=AUTH_HEADERS)
        assert dup_resp.status_code == 400
        detail = dup_resp.json().get("detail", "")
        assert "already exists" in detail
        assert "Test Salary API" in detail
        assert "salary" in detail

        # 3. Attempt with trailing slash variant -> must also be caught as duplicate
        dup_slash_payload = {
            "name": "Another Salary Feed",
            "url": unique_url + "/",
            "category": "salary",
            "source_type": "api",
            "is_active": 1,
        }
        dup_slash_resp = client.post("/api/admin/data-sources", json=dup_slash_payload, headers=AUTH_HEADERS)
        assert dup_slash_resp.status_code == 400
        assert "already exists" in dup_slash_resp.json().get("detail", "")

    finally:
        # Cleanup
        del_resp = client.delete(f"/api/admin/data-sources/{source_id}", headers=AUTH_HEADERS)
        assert del_resp.status_code == 200


def test_create_data_source_validation_errors():
    # Invalid URL scheme
    res1 = client.post("/api/admin/data-sources", json={
        "name": "Bad URL Source",
        "url": "ftp://some-server.com/jobs",
        "category": "salary",
        "source_type": "api",
    }, headers=AUTH_HEADERS)
    assert res1.status_code == 400
    assert "URL must start with http:// or https://" in res1.json().get("detail", "")

    # Invalid Category
    res2 = client.post("/api/admin/data-sources", json={
        "name": "Bad Category Source",
        "url": "https://valid-url.com/feed",
        "category": "non_existent_category",
        "source_type": "api",
    }, headers=AUTH_HEADERS)
    assert res2.status_code == 400
    assert "Invalid category" in res2.json().get("detail", "")

    # Invalid Source Type
    res3 = client.post("/api/admin/data-sources", json={
        "name": "Bad Type Source",
        "url": "https://valid-url.com/feed",
        "category": "salary",
        "source_type": "invalid_type",
    }, headers=AUTH_HEADERS)
    assert res3.status_code == 400
    assert "Invalid source type" in res3.json().get("detail", "")

    # Empty Name
    res4 = client.post("/api/admin/data-sources", json={
        "name": "   ",
        "url": "https://valid-url.com/feed",
        "category": "salary",
        "source_type": "api",
    }, headers=AUTH_HEADERS)
    assert res4.status_code == 400
    assert "Source name cannot be empty" in res4.json().get("detail", "")


def test_update_data_source():
    # Create temp source
    temp_url = "https://update-test.example.com/api"
    create_resp = client.post("/api/admin/data-sources", json={
        "name": "Initial Source Name",
        "url": temp_url,
        "category": "salary",
        "source_type": "api",
        "is_active": 1,
    }, headers=AUTH_HEADERS)
    assert create_resp.status_code == 201
    source_id = create_resp.json()["id"]

    try:
        # Patch is_active and name
        patch_resp = client.patch(f"/api/admin/data-sources/{source_id}", json={
            "name": "Updated Source Name",
            "is_active": 0,
        }, headers=AUTH_HEADERS)
        assert patch_resp.status_code == 200
        patched = patch_resp.json()
        assert patched["name"] == "Updated Source Name"
        assert patched["is_active"] == 0

    finally:
        client.delete(f"/api/admin/data-sources/{source_id}", headers=AUTH_HEADERS)


def test_repair_data_sources_idempotent():
    import uuid
    from database.session import SessionLocal
    from database.models import DataSource
    from database.init_db import repair_data_sources

    db = SessionLocal()
    uid = uuid.uuid4().hex[:8]
    src1 = None
    src2 = None
    try:
        # Create misconfigured watercooler and Lobsters records with unique test URLs
        src1 = DataSource(
            name=f"Misconfigured Watercooler {uid}",
            url=f"https://dev.to/feed/tag/watercooler?uid={uid}",
            category="jobs",
            source_type="api",
            is_active=1
        )
        src2 = DataSource(
            name=f"Lobste.rs Discussions {uid}",
            url=f"https://lobste.rs?uid={uid}",
            category="jobs",
            source_type="api",
            is_active=1
        )
        db.add_all([src1, src2])
        db.commit()
        db.refresh(src1)
        db.refresh(src2)

        # Run repair
        repair_data_sources(db)

        db.refresh(src1)
        db.refresh(src2)

        assert src1.category == "social"
        assert src1.source_type == "rss"
        assert src2.category == "tech"
    finally:
        # Clean up any test records
        try:
            if src1:
                db.delete(src1)
            if src2:
                db.delete(src2)
            db.commit()
        except Exception:
            db.rollback()
        # Also clean up any lingering test records from previous run
        try:
            db.query(DataSource).filter(DataSource.name.ilike("%Test%")).delete()
            db.commit()
        except Exception:
            db.rollback()
        db.close()
