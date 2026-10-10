import os
import pytest
from fastapi.testclient import TestClient

from api.main import app
from database.init_db import ensure_database_schema

ensure_database_schema()

client = TestClient(app)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")


def test_backup_export_and_import_flow():
    """Verify exporting snapshot, inspecting JSON structure, and importing."""
    # 1. Export
    export_res = client.get("/api/admin/backup/export", headers={"x-api-key": ADMIN_KEY})
    assert export_res.status_code == 200
    data = export_res.json()
    assert "version" in data
    assert "exported_at" in data
    assert "eras" in data
    assert "globe_config" in data
    assert isinstance(data["eras"], list)

    # 2. Modify and import
    backup_payload = {
        "eras": [
            {
                "year": 1964,
                "title": "Mainframe Computing Era",
                "subtitle": "IBM System/360 and punchcard automation",
                "stats": {
                    "stack_tags": ["COBOL", "Fortran", "Assembly"],
                    "key_roles": ["Systems Engineer", "Keypunch Operator"],
                    "icon": "Cpu",
                    "mood_color": "#38bdf8",
                    "dossier_markdown": "Historical transition to centralized corporate computing.",
                },
            }
        ],
        "globe_config": {
            "batch_rotation_seconds": 18,
            "max_visible_pins": 12,
            "hype_ratio": 60,
        },
    }

    import_res = client.post(
        "/api/admin/backup/import",
        json=backup_payload,
        headers={"x-api-key": ADMIN_KEY}
    )
    assert import_res.status_code == 200
    res_data = import_res.json()
    assert res_data["status"] == "restored"
    assert res_data["eras_imported"] == 1
    assert res_data["globe_config_restored"] is True
