import os
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")


@pytest.fixture(autouse=True, scope="module")
def setup_db():
    from database.session import engine
    from database.init_db import ensure_database_schema
    ensure_database_schema(engine)


def test_public_globe_config():
    """Verify that public /api/globe/config endpoint returns default valid config."""
    response = client.get("/api/globe/config")
    assert response.status_code == 200
    data = response.json()
    assert "batch_rotation_seconds" in data
    assert "max_visible_pins" in data
    assert "hype_ratio" in data
    assert "prioritize_salary" in data
    assert "prioritize_trending_tech" in data
    assert "pause_on_hover" in data
    assert isinstance(data["batch_rotation_seconds"], int)
    assert 5 <= data["batch_rotation_seconds"] <= 60


def test_admin_globe_config_unauthorized():
    """Admin route must reject requests without x-api-key."""
    response = client.get("/api/admin/globe/config")
    assert response.status_code == 401


def test_admin_globe_config_authorized():
    """Admin route returns globe config when authorized."""
    response = client.get("/api/admin/globe/config", headers={"x-api-key": ADMIN_KEY})
    assert response.status_code == 200
    data = response.json()
    assert "batch_rotation_seconds" in data
    assert "max_visible_pins" in data


def test_admin_globe_config_update():
    """Admin route updates and persists globe config."""
    update_payload = {
        "batch_rotation_seconds": 18,
        "max_visible_pins": 12,
        "hype_ratio": 60,
        "prioritize_salary": False,
        "prioritize_trending_tech": True,
        "pause_on_hover": True,
    }
    response = client.put(
        "/api/admin/globe/config",
        json=update_payload,
        headers={"x-api-key": ADMIN_KEY}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["batch_rotation_seconds"] == 18
    assert data["max_visible_pins"] == 12
    assert data["hype_ratio"] == 60
    assert data["prioritize_salary"] is False

    # Check public endpoint reflects the update
    pub_res = client.get("/api/globe/config")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["batch_rotation_seconds"] == 18
    assert pub_data["max_visible_pins"] == 12

    # Reset back to default for clean state
    reset_payload = {
        "batch_rotation_seconds": 15,
        "max_visible_pins": 14,
        "hype_ratio": 50,
        "prioritize_salary": True,
        "prioritize_trending_tech": True,
        "pause_on_hover": True,
    }
    client.put("/api/admin/globe/config", json=reset_payload, headers={"x-api-key": ADMIN_KEY})


def test_admin_globe_config_validation():
    """Admin route validates bounds (e.g. invalid rotation seconds or out of bounds pins)."""
    invalid_payload = {
        "batch_rotation_seconds": 2,  # ge=5
        "max_visible_pins": 100,      # le=30
        "hype_ratio": 50,
        "prioritize_salary": True,
        "prioritize_trending_tech": True,
        "pause_on_hover": True,
    }
    response = client.put(
        "/api/admin/globe/config",
        json=invalid_payload,
        headers={"x-api-key": ADMIN_KEY}
    )
    assert response.status_code == 422
