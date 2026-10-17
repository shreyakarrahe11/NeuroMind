from app.core.config import Settings


def _production_settings(**overrides):
    values = {
        "environment": "production",
        "debug": False,
        "api_docs_enabled": False,
        "auth_return_tokens": False,
        "database_url": "postgresql+psycopg://neuromind:real-password@postgres:5432/neuromind",
        "jwt_secret_key": "a-production-jwt-secret-that-is-long-and-unique",
        "data_encryption_key": "R2VudWluZUZlcm5ldEtleVdpdGhGb3J0eVRocmVlQ2hhcnM=",
        "initial_admin_password": "UniqueAdminPassword!123",
        "clerk_issuer": "https://tenant.clerk.accounts.dev",
        "clerk_secret_key": "sk_live_test_server_key_value",
        "clerk_authorized_parties": "https://app.neuromind.health",
        "frontend_origins": "https://app.neuromind.health",
        "task_queue_mode": "celery",
        "redis_url": "redis://redis:6379/0",
        "storage_backend": "s3",
        "s3_bucket": "neuromind-private",
        "chroma_host": "chroma",
        "auto_create_initial_admin": False,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_safe_production_configuration_passes_validation():
    assert _production_settings().validate_runtime() == []


def test_production_placeholders_and_single_process_services_are_rejected():
    errors = _production_settings(
        jwt_secret_key="replace-with-a-secret-that-is-long-enough",
        data_encryption_key="generate-a-fernet-key-that-is-long-enough-here",
        initial_admin_password="replace-with-a-unique-strong-password",
        clerk_issuer="https://your-clerk-issuer.example",
        clerk_secret_key="",
        clerk_authorized_parties="http://localhost:5173",
        frontend_origins="http://localhost:5173",
        task_queue_mode="background",
        storage_backend="local",
        s3_bucket="",
        chroma_host="",
        rate_limit_enabled=False,
        auth_return_tokens=True,
    ).validate_runtime()

    assert any("JWT_SECRET_KEY" in error for error in errors)
    assert any("DATA_ENCRYPTION_KEY" in error for error in errors)
    assert any("INITIAL_ADMIN_PASSWORD" in error for error in errors)
    assert any("CLERK_SECRET_KEY" in error for error in errors)
    assert any("TASK_QUEUE_MODE" in error for error in errors)
    assert any("STORAGE_BACKEND" in error for error in errors)
    assert any("FRONTEND_ORIGINS" in error for error in errors)
    assert any("RATE_LIMIT_ENABLED" in error for error in errors)
    assert any("AUTH_RETURN_TOKENS" in error for error in errors)


def test_model_readiness_requires_offline_wav2vec_backbone():
    errors = _production_settings(
        require_models_for_readiness=True,
        speech_model_path="/models/speech.pt",
        multimodal_model_path="/models/fusion.pt",
        gemini_api_key="real-provider-key",
        wav2vec_local_files_only=True,
        wav2vec_model_name="/missing/wav2vec2-backbone",
    ).validate_runtime()

    assert any("Wav2Vec2" in error for error in errors)
