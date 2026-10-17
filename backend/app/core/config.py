from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NeuroMind API"
    environment: str = "development"
    debug: bool = True
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/neuromind"
    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_pool_timeout: int = 30

    task_queue_mode: str = "background"
    redis_url: str = "redis://localhost:6379/0"
    task_soft_time_limit_seconds: int = 900
    task_time_limit_seconds: int = 1200

    jwt_secret_key: str = ""
    data_encryption_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    auth_return_tokens: bool = True
    login_max_failures: int = 5
    login_window_minutes: int = 15
    rate_limit_enabled: bool = True

    # Clerk is used only for PATIENT authentication. The backend exchanges a
    # verified Clerk session token for a NeuroMind API token.
    clerk_jwt_key: str = ""
    clerk_secret_key: str = ""
    clerk_issuer: str = ""
    clerk_jwks_url: str = ""
    clerk_authorized_parties: str = ""

    frontend_origins: str = "http://localhost:3000,http://localhost:5173"
    storage_backend: str = "local"
    storage_path: str = "./storage"
    s3_bucket: str = ""
    s3_region: str = "us-east-1"
    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_use_ssl: bool = True
    s3_server_side_encryption: str = ""
    knowledge_base_path: str = "./knowledge_base"
    max_upload_mb: int = 25

    speech_model_path: str = ""
    memory_model_path: str = ""
    attention_model_path: str = ""
    lifestyle_model_path: str = ""
    multimodal_model_path: str = ""
    report_model_path: str = ""

    wav2vec_model_name: str = "facebook/wav2vec2-base-960h"
    wav2vec_local_files_only: bool = False

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    vector_db_type: str = "chroma"
    chroma_path: str = "./chroma_db"
    chroma_host: str = ""
    chroma_port: int = 8000
    chroma_ssl: bool = False
    pinecone_api_key: str = ""
    pinecone_index_name: str = ""
    model_device: str = "cpu"
    model_load_on_startup: bool = False
    require_rag_evidence_for_report: bool = True
    require_models_for_readiness: bool = False

    # Local administrator bootstrap. The setup script creates a unique password
    # in backend/.env; credentials are never embedded in the browser bundle.
    initial_admin_email: str = "admin@neuromind.local"
    initial_admin_password: str = ""
    auto_create_initial_admin: bool = True
    api_docs_enabled: bool = True

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=False, extra="ignore"
    )

    @property
    def origins(self):
        return [x.strip() for x in self.frontend_origins.split(",") if x.strip()]

    @property
    def clerk_parties(self):
        return [x.strip() for x in self.clerk_authorized_parties.split(",") if x.strip()]

    @property
    def storage_dir(self):
        return Path(self.storage_path)

    @property
    def knowledge_dir(self):
        return Path(self.knowledge_base_path)

    @property
    def has_clerk_verification(self):
        return bool(self.clerk_jwt_key.strip() or self.clerk_jwks_endpoint)

    @property
    def clerk_jwks_endpoint(self):
        if self.clerk_jwks_url.strip():
            return self.clerk_jwks_url.strip()
        if self.clerk_issuer.strip():
            return f"{self.clerk_issuer.rstrip('/')}/.well-known/jwks.json"
        return ""

    @property
    def is_production(self):
        return self.environment.strip().lower() in {"production", "prod"}

    def validate_runtime(self):
        errors = []
        if not self.is_production:
            return errors
        placeholder_markers = ("replace-with", "generate-a-", "your-")
        if self.debug:
            errors.append("DEBUG must be false in production")
        if self.api_docs_enabled:
            errors.append("API_DOCS_ENABLED must be false in production")
        if self.auth_return_tokens:
            errors.append("AUTH_RETURN_TOKENS must be false in production; use HttpOnly session cookies")
        if len(self.jwt_secret_key) < 32 or any(marker in self.jwt_secret_key.lower() for marker in placeholder_markers):
            errors.append("JWT_SECRET_KEY must be a unique secret of at least 32 characters")
        if len(self.data_encryption_key) < 40 or any(marker in self.data_encryption_key.lower() for marker in placeholder_markers):
            errors.append("DATA_ENCRYPTION_KEY must be a unique Fernet key")
        if len(self.initial_admin_password) < 12 or self.initial_admin_password in {
            "NeuroMind@Admin123!",
            "generate-a-unique-strong-password",
            "replace-with-a-unique-strong-password",
        }:
            errors.append("INITIAL_ADMIN_PASSWORD must be a unique password of at least 12 characters")
        if "YOUR_POSTGRES_PASSWORD" in self.database_url:
            errors.append("DATABASE_URL still contains the placeholder password")
        if not self.has_clerk_verification:
            errors.append("Clerk JWT verification is not configured")
        if not self.clerk_secret_key.strip() or not self.clerk_secret_key.strip().startswith("sk_"):
            errors.append("CLERK_SECRET_KEY is required in production for verified patient identity lookup")
        if any(marker in (self.clerk_issuer + self.clerk_jwks_url).lower() for marker in placeholder_markers):
            errors.append("Clerk issuer/JWKS still contains a placeholder")
        if not self.clerk_parties or any("localhost" in item or "example" in item for item in self.clerk_parties):
            errors.append("CLERK_AUTHORIZED_PARTIES must contain the deployed frontend origin")
        if self.task_queue_mode.strip().lower() != "celery":
            errors.append("TASK_QUEUE_MODE must be celery in production")
        if not self.redis_url.strip():
            errors.append("REDIS_URL is required in production")
        if not self.rate_limit_enabled:
            errors.append("RATE_LIMIT_ENABLED must be true in production")
        if self.storage_backend.strip().lower() != "s3":
            errors.append("STORAGE_BACKEND must be s3 in production for multi-instance safety")
        if not self.s3_bucket.strip():
            errors.append("S3_BUCKET is required in production")
        if not self.chroma_host.strip():
            errors.append("CHROMA_HOST is required in production")
        if self.require_models_for_readiness:
            if not self.speech_model_path.strip() or not self.multimodal_model_path.strip():
                errors.append("Speech and multimodal model paths are required for production readiness")
            if not self.wav2vec_local_files_only or not Path(self.wav2vec_model_name).is_dir():
                errors.append("Production readiness requires a local offline Wav2Vec2 backbone directory")
            if not self.gemini_api_key.strip() or any(marker in self.gemini_api_key.lower() for marker in placeholder_markers):
                errors.append("GEMINI_API_KEY is required for production readiness")
        if "*" in self.origins:
            errors.append("FRONTEND_ORIGINS cannot contain * when credentials are enabled")
        if any(not origin.startswith("https://") or "example" in origin for origin in self.origins):
            errors.append("FRONTEND_ORIGINS must contain only deployed HTTPS origins")
        return errors


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()
