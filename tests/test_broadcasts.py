import os
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from api.main import app
from database.session import get_db
from database.init_db import ensure_database_schema

ensure_database_schema()

client = TestClient(app)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")


def test_broadcast_pins_admin_and_public_flow():
    """Verify manual broadcast pin creation with justification, listing, toggle and expiration."""
    # 1. Validation error: expiration in the past
    past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    bad_res = client.post(
        "/api/admin/broadcasts",
        json={
            "title": "Expired Test",
            "description": "Valid description with over ten chars",
            "category": "education",
            "institution": "Mercantec",
            "location_name": "Viborg, Denmark",
            "latitude": 56.4532,
            "longitude": 9.4020,
            "justification": "Legitimate reason for educational course launch",
            "expires_at": past_date,
        },
        headers={"x-api-key": ADMIN_KEY}
    )
    assert bad_res.status_code == 400

    # 2. Valid creation
    create_res = client.post(
        "/api/admin/broadcasts",
        json={
            "title": "New AI Engineering Course 2027",
            "description": "Mercantec Viborg launches an intensive vocational specialization in autonomous AI agents and Rust robotics.",
            "category": "education",
            "institution": "Mercantec Tech Campus",
            "location_name": "Viborg, Denmark",
            "latitude": 56.4532,
            "longitude": 9.4020,
            "url": "https://mercantec.dk/ai-engineering",
            "justification": "Official educational program launch for Viborg region tech students",
            "expires_at": future_date,
        },
        headers={"x-api-key": ADMIN_KEY}
    )
    assert create_res.status_code == 201
    pin_data = create_res.json()
    pin_id = pin_data["id"]
    assert pin_data["title"] == "New AI Engineering Course 2027"
    assert pin_data["is_active"] is True

    # 3. List in admin
    admin_list = client.get("/api/admin/broadcasts", headers={"x-api-key": ADMIN_KEY})
    assert admin_list.status_code == 200
    items = admin_list.json()
    assert any(p["id"] == pin_id for p in items)

    # 4. Public endpoint
    public_res = client.get("/api/globe/broadcasts")
    assert public_res.status_code == 200
    pub_items = public_res.json()
    assert any(p["id"] == pin_id for p in pub_items)

    # 5. Toggle active
    toggle_res = client.post(f"/api/admin/broadcasts/{pin_id}/toggle", headers={"x-api-key": ADMIN_KEY})
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # 6. Verify hidden from public
    pub_res_after = client.get("/api/globe/broadcasts")
    assert not any(p["id"] == pin_id for p in pub_res_after.json())

    # 7. Delete pin
    del_res = client.delete(f"/api/admin/broadcasts/{pin_id}", headers={"x-api-key": ADMIN_KEY})
    assert del_res.status_code == 200
