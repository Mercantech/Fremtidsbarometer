import os
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from api.main import app
from database.session import get_session
from database.models import AIModelConfig, SystemLog
from agents.orchestrator import get_active_model
from agents.ai_provider import get_ai_provider, check_provider_key_present, verify_provider_keys

client = TestClient(app)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin_dev_key_12345")
AUTH_HEADERS = {"x-api-key": ADMIN_KEY}


def test_get_active_model_has_no_api_key():
    """Verify get_active_model does not return api_key from database."""
    db = get_session()
    try:
        config = get_active_model(db, "jobs_extraction")
        assert "provider" in config
        assert "model_name" in config
        assert "api_key" not in config
    finally:
        db.close()


def test_provider_resolves_key_from_env():
    """Verify get_ai_provider resolves keys from environment variables."""
    with patch.dict(os.environ, {"GEMINI_API_KEY": "test_gemini_env_key_999"}):
        provider = get_ai_provider(provider="google", model_name="gemini-3.8-flash")
        assert provider.model_name == "gemini-3.8-flash"

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test_openai_env_key_888"}):
        provider = get_ai_provider(provider="openai", model_name="gpt-4o-mini")
        assert provider.model_name == "gpt-4o-mini"
        assert provider.api_key == "test_openai_env_key_888"


def test_create_and_update_ai_model_without_api_key():
    """
    Verify POST/PATCH endpoints for ai-models do not require or expose api_key.
    Any legacy api_key input is discarded and stored as NULL.
    """
    model_name = "test-custom-model-v1"
    create_payload = {
        "task_type": "jobs_extraction",
        "model_name": model_name,
        "provider": "google",
        "is_active": 0,
        "is_fallback": 1
    }

    resp = client.post("/api/admin/ai-models", json=create_payload, headers=AUTH_HEADERS)
    assert resp.status_code == 201
    data = resp.json()

    assert data["model_name"] == model_name
    assert "api_key" not in data
    assert "masked_key" not in data
    assert "has_custom_key" not in data
    assert "env_key_present" in data
    assert isinstance(data["env_key_present"], bool)
    created_id = data["id"]

    try:
        # Verify in DB that api_key is strictly NULL
        db = get_session()
        try:
            db_rec = db.query(AIModelConfig).filter(AIModelConfig.id == created_id).first()
            assert db_rec.api_key is None
        finally:
            db.close()

        # Test PATCH update works without api_key
        patch_resp = client.patch(f"/api/admin/ai-models/{created_id}", json={"is_fallback": 0}, headers=AUTH_HEADERS)
        assert patch_resp.status_code == 200
        patch_data = patch_resp.json()
        assert patch_data["is_fallback"] == 0
        assert "api_key" not in patch_data
    finally:
        # Cleanup
        client.delete(f"/api/admin/ai-models/{created_id}", headers=AUTH_HEADERS)


def test_providers_status_endpoint():
    """
    Verify GET /api/admin/ai-models/providers-status returns provider status
    without exposing any secret tokens.
    """
    resp = client.get("/api/admin/ai-models/providers-status", headers=AUTH_HEADERS)
    assert resp.status_code == 200
    providers = resp.json()
    assert isinstance(providers, list)
    assert len(providers) > 0

    google_entry = next((p for p in providers if p["provider"] == "google"), None)
    assert google_entry is not None
    assert google_entry["env_var"] == "GEMINI_API_KEY"
    assert isinstance(google_entry["is_configured"], bool)

    # Ensure no secret key text leaks
    for entry in providers:
        assert "api_key" not in entry
        assert "key" not in entry
        assert "token" not in entry


def test_startup_env_verification_logs_for_active_and_fallback():
    """
    Verify verify_provider_keys:
    1. Logs WARNING when an active provider lacks an env key.
    2. Logs WARNING with '(fallback provider has no key)' when a fallback provider lacks an env key.
    3. Never logs actual secret values.
    """
    db = get_session()
    try:
        # Temporarily create test active and fallback models with missing keys
        active_missing = AIModelConfig(
            task_type="social_extraction",
            model_name="mock-active-model",
            provider="mock_active_provider",
            is_active=1,
            is_fallback=0
        )
        fallback_missing = AIModelConfig(
            task_type="social_extraction",
            model_name="mock-fallback-model",
            provider="mock_fallback_provider",
            is_active=0,
            is_fallback=1
        )
        db.add_all([active_missing, fallback_missing])
        db.commit()

        # Run verification
        statuses = verify_provider_keys(db)

        # Check that SystemLog recorded the warnings
        logs = db.query(SystemLog).filter(
            SystemLog.component == "AIProviderEnvCheck"
        ).order_by(SystemLog.id.desc()).limit(10).all()

        active_log = next((l for l in logs if "mock_active_provider" in l.message), None)
        assert active_log is not None
        assert active_log.level == "WARNING"
        assert "Active AI provider 'mock_active_provider' has no key" in active_log.message

        fallback_log = next((l for l in logs if "mock_fallback_provider" in l.message), None)
        assert fallback_log is not None
        assert fallback_log.level == "WARNING"
        assert "fallback provider has no key" in fallback_log.message

    finally:
        # Cleanup test records
        db.query(AIModelConfig).filter(
            AIModelConfig.provider.in_(["mock_active_provider", "mock_fallback_provider"])
        ).delete()
        db.query(SystemLog).filter(
            SystemLog.component == "AIProviderEnvCheck"
        ).delete()
        db.commit()
        db.close()


def test_all_database_api_keys_are_null():
    """Verify that all stored AI model configurations have api_key IS NULL."""
    # Trigger get_ai_models to run the neutralization query
    client.get("/api/admin/ai-models", headers=AUTH_HEADERS)

    db = get_session()
    try:
        non_null_keys = db.query(AIModelConfig).filter(
            AIModelConfig.api_key.isnot(None),
            AIModelConfig.api_key != ""
        ).all()
        assert len(non_null_keys) == 0, f"Found {len(non_null_keys)} records with non-null api_key in DB!"
    finally:
        db.close()


def test_gemini_provider_does_not_silently_replace_model():
    """Verify GeminiProvider does not silently substitute deprecated or custom model names."""
    from agents.ai_provider import GeminiProvider

    provider = GeminiProvider(model_name="gemini-2.5-pro")
    assert provider.model_name == "gemini-2.5-pro"

    provider_prefix = GeminiProvider(model_name="models/my-custom-model-v2")
    assert provider_prefix.model_name == "my-custom-model-v2"


def test_ai_model_test_connection_endpoint_missing_key():
    """Verify test-connection returns informative error when key is missing."""
    with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
        resp = client.post("/api/admin/ai-models/test-connection", json={
            "provider": "openai",
            "model_name": "gpt-4o-mini"
        }, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert "OPENAI_API_KEY" in data["message"]


def test_ai_model_test_connection_endpoint_success():
    """Verify test-connection mock success handling."""
    from unittest.mock import AsyncMock
    with patch("agents.ai_provider.test_model_connection", new_callable=AsyncMock) as mock_test:
        mock_test.return_value = {
            "success": True,
            "status": "ok",
            "latency_ms": 250,
            "message": "Модель ответила за 250мс: OK"
        }
        resp = client.post("/api/admin/ai-models/test-connection", json={
            "provider": "google",
            "model_name": "gemini-3.8-flash"
        }, headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["latency_ms"] == 250
        assert "OK" in data["message"]
