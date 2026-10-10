import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from api.main import app
from database.init_db import ensure_database_schema

ensure_database_schema()

client = TestClient(app)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")


def test_audit_logs_flow():
    """Verify that admin actions generate audit logs and they are retrievable via GET /api/admin/audit-logs."""
    headers = {"x-api-key": ADMIN_KEY}

    # 1. Unauthenticated access rejected
    unauth = client.get("/api/admin/audit-logs")
    assert unauth.status_code == 401

    # 2. Perform a broadcast creation action
    future_date = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    broadcast_payload = {
        "title": "Audit Test Mercantec AI Hackathon",
        "description": "Annual student hackathon at Viborg campus",
        "category": "hackathon",
        "institution": "Mercantec",
        "location_name": "Viborg, Denmark",
        "latitude": 56.4532,
        "longitude": 9.4020,
        "justification": "Approved institutional education event for audit log verification",
        "expires_at": future_date,
    }
    create_res = client.post("/api/admin/broadcasts", json=broadcast_payload, headers=headers)
    assert create_res.status_code == 201
    pin_id = create_res.json()["id"]

    # 3. Retrieve audit logs and check for BROADCAST_CREATE
    audit_res = client.get("/api/admin/audit-logs?limit=10", headers=headers)
    assert audit_res.status_code == 200
    data = audit_res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1

    found_action = False
    for item in data["items"]:
        if item["action"] == "BROADCAST_CREATE" and item["entity_id"] == str(pin_id):
            found_action = True
            assert item["entity_type"] == "broadcast_pin"
            assert "Mercantec" in str(item["details"])
            break
    assert found_action, "BROADCAST_CREATE action was not logged in audit logs"

    # 4. Toggle broadcast pin and check for BROADCAST_TOGGLE
    toggle_res = client.post(f"/api/admin/broadcasts/{pin_id}/toggle", headers=headers)
    assert toggle_res.status_code == 200

    # 5. Filter audit logs by action
    filtered_res = client.get("/api/admin/audit-logs?action=BROADCAST_TOGGLE", headers=headers)
    assert filtered_res.status_code == 200
    filtered_data = filtered_res.json()
    assert any(i["action"] == "BROADCAST_TOGGLE" and i["entity_id"] == str(pin_id) for i in filtered_data["items"])

    # 6. Clean up the broadcast pin
    del_res = client.delete(f"/api/admin/broadcasts/{pin_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify BROADCAST_DELETE was logged
    del_audit_res = client.get(f"/api/admin/audit-logs?search={pin_id}", headers=headers)
    assert del_audit_res.status_code == 200
    del_items = del_audit_res.json()["items"]
    assert any(i["action"] == "BROADCAST_DELETE" for i in del_items)
