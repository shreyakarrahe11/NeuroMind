"""Run from backend/: python -m scripts.production_preflight [--probe-gemini].

Checks deployed services and real artifact execution without using patient data.
This does not replace patient-level validation or a browser end-to-end test.
"""

import argparse
import json
from urllib.request import urlopen

from sqlalchemy import func, select, text

from app.ai.models.multimodal_model import MultimodalModelService
from app.ai.models.speech_model import SpeechModelService
from app.ai.model_registry import inference_ready
from app.ai.rag.retriever import rag
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.entities import KnowledgeChunk
from app.services.task_dispatcher import task_queue_ready


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe-gemini", action="store_true", help="Make one small real Gemini request")
    parser.add_argument("--check-shap", action="store_true", help="Execute a model SHAP smoke check")
    args = parser.parse_args()
    failures = []

    def check(name, action):
        try:
            result = action()
            if result is False:
                raise RuntimeError("check returned false")
            print(f"[PASS] {name}")
        except Exception as exc:
            failures.append(name)
            # Never print a provider error that might contain credentials or
            # patient data; the check name is enough to locate the setting.
            print(f"[FAIL] {name}: {exc.__class__.__name__}")

    def config():
        if settings.validate_runtime():
            raise RuntimeError("unsafe runtime configuration")
        if not settings.gemini_api_key:
            raise RuntimeError("Gemini is not configured")
        if not settings.has_clerk_verification:
            raise RuntimeError("Clerk verification is not configured")

    check("Configuration, Clerk and Gemini settings", config)

    def database():
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        config = Config("alembic.ini")
        head = ScriptDirectory.from_config(config).get_current_head()
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            version = db.scalar(text("SELECT version_num FROM alembic_version"))
        if not head or version != head:
            raise RuntimeError("Database migrations have not reached the current head")

    check("Database connection and migrations", database)

    def queue():
        if not task_queue_ready():
            raise RuntimeError("Redis broker is unavailable")
        if settings.task_queue_mode.lower() == "celery":
            from app.tasks.celery_app import celery_app
            if not celery_app.control.inspect(timeout=2).stats():
                raise RuntimeError("No active Celery worker is registered")

    check("Processing broker and worker", queue)

    def model_contract():
        import numpy as np
        from app.ai.embeddings.wav2vec_service import wav2vec_service

        speech = SpeechModelService()
        fusion = MultimodalModelService()
        if not inference_ready() or speech.status().value != "READY" or fusion.status().value != "READY":
            raise RuntimeError("Speech or fusion artifact is not READY")
        backbone = wav2vec_service().embed_sequence(np.zeros(16000, dtype=np.float32), 16000)
        output = speech.encode_sequence(backbone)
        feature_names = fusion.manifest["input_features"]
        means = fusion.manifest.get("background_values")
        if means is None or len(means) != len(feature_names):
            raise RuntimeError("Fusion manifest lacks an exact training background")
        features = dict(zip(feature_names, means))
        for index, value in enumerate(output["embedding"]):
            features[f"speech_embedding_{index}"] = value
        result = fusion.predict(features)
        probabilities = result["class_probabilities"]
        if set(probabilities) != {"Dementia", "Non-Dementia"} or abs(sum(probabilities.values()) - 1) > 1e-4:
            raise RuntimeError("Binary probabilities are incompatible")
        if args.check_shap:
            from app.ai.explainability.shap_service import SHAPService
            rows = SHAPService().explain(
                fusion.load_model(), fusion.prepare_input([features]),
                fusion.manifest, list(fusion.manifest["class_labels"]).index(result["label"]),
            )
            if not rows:
                raise RuntimeError("SHAP returned no feature rows")

    check("Real Wav2Vec2 → speech → fusion inference" + (" and SHAP" if args.check_shap else ""), model_contract)

    def knowledge():
        with SessionLocal() as db:
            if not db.scalar(select(func.count()).select_from(KnowledgeChunk)):
                raise RuntimeError("No PDF chunks in PostgreSQL")
            ready, _ = rag.semantic_status(db)
            if not ready:
                raise RuntimeError("Semantic index needs reconciliation")

    check("RAG knowledge database and semantic index", knowledge)

    def clerk_jwks():
        if settings.clerk_jwt_key.strip():
            return True
        endpoint = settings.clerk_jwks_endpoint
        if not endpoint.startswith("https://"):
            raise RuntimeError("Expected HTTPS Clerk JWKS")
        with urlopen(endpoint, timeout=5) as response:
            return bool(json.load(response).get("keys"))

    check("Clerk signing keys reachable", clerk_jwks)

    if args.probe_gemini:
        def gemini():
            from google import genai
            client = genai.Client(api_key=settings.gemini_api_key)
            result = client.models.generate_content(model=settings.gemini_model, contents="Reply OK.")
            return bool(result.text)

        check("Gemini provider response", gemini)

    print(f"Preflight: {len(failures)} failure(s). A clinical holdout and browser patient → doctor run are still required.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
