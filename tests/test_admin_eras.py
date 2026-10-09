import os
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")


def test_list_admin_eras():
    """Admin route returns list of eras."""
    response = client.get("/api/admin/eras", headers={"x-api-key": ADMIN_KEY})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Chronological sort check
    years = [e["year"] for e in data]
    assert years == sorted(years)


def test_create_and_manage_admin_era():
    """Create a new custom future era, update it, verify public visibility, then delete it."""
    test_year = 2088
    # Clean up if already exists from previous runs
    existing = client.get("/api/admin/eras", headers={"x-api-key": ADMIN_KEY}).json()
    for e in existing:
        if e["year"] == test_year:
            client.delete(f"/api/admin/eras/{e['id']}", headers={"x-api-key": ADMIN_KEY})

    # 1. Create Era
    new_era = {
        "year": test_year,
        "title": "Solar Singularity Era",
        "subtitle": "Orbital compute swarms and Dyson mesh networking",
        "stats": {
            "icon": "☀️",
            "moodColor": "#ffaa00",
            "roles": [["Orbital Kernel Architect", "SPACE", "Manages zero-g optical quantum arrays"]],
            "stack": [["SolarLang", "LANGUAGE", "Zero-latency optical pipeline syntax"]]
        }
    }
    create_res = client.post("/api/admin/eras", json=new_era, headers={"x-api-key": ADMIN_KEY})
    assert create_res.status_code == 201
    created = create_res.json()
    era_id = created["id"]
    assert created["year"] == test_year
    assert created["title"] == "Solar Singularity Era"

    # 2. Duplicate year check (must return 409)
    dup_res = client.post("/api/admin/eras", json=new_era, headers={"x-api-key": ADMIN_KEY})
    assert dup_res.status_code == 409

    # 3. Update Era
    update_payload = {
        "title": "Quantum Solar Singularity Era",
        "subtitle": "Updated Dyson mesh architecture"
    }
    put_res = client.put(f"/api/admin/eras/{era_id}", json=update_payload, headers={"x-api-key": ADMIN_KEY})
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["title"] == "Quantum Solar Singularity Era"
    assert updated["subtitle"] == "Updated Dyson mesh architecture"

    # 4. Verify public /api/eras returns the custom era
    pub_res = client.get("/api/eras")
    assert pub_res.status_code == 200
    pub_eras = pub_res.json()
    found = [e for e in pub_eras if e["id"] == era_id]
    assert len(found) == 1
    assert found[0]["title"] == "Quantum Solar Singularity Era"

    # 5. Delete Era
    del_res = client.delete(f"/api/admin/eras/{era_id}", headers={"x-api-key": ADMIN_KEY})
    assert del_res.status_code == 200

    # 6. Verify deleted
    get_res = client.get(f"/api/admin/eras/{era_id}", headers={"x-api-key": ADMIN_KEY})
    assert get_res.status_code == 404
