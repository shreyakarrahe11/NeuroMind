# NeuroMind deployment guide

The existing React UI is preserved. Production serves the built frontend through
Nginx, proxies `/api/` and `/health/` to FastAPI, and keeps PostgreSQL, Redis,
Chroma, MinIO and model artifacts on the private Docker network/volumes.

## Prerequisites

- A Linux host or VM with Docker Engine and Docker Compose v2.
- A stable domain name with HTTPS configured at the host/reverse proxy/load balancer.
- A configured Clerk application and server-side Clerk secret.
- A Gemini API key.
- A compatible, validated Phase 1 model bundle hosted at a stable HTTPS direct-download URL.
- Enough RAM/disk for PyTorch, Transformers, the offline Wav2Vec2 backbone, PostgreSQL, Chroma and audio/report storage.

GitHub hosts the source and runs CI; GitHub Pages alone cannot run this backend,
PostgreSQL, Celery worker or model inference. Deploy the containers to a host or
container platform that supports the complete production Compose stack.

## 1. Prepare environment files

From the repository root:

```bash
cp .env.production.compose.example .env.production.compose
cp backend/.env.production.example backend/.env.production
```

Edit `.env.production.compose` with:

- `PUBLIC_ORIGIN`: the final public website origin, including `https://`, with no trailing slash.
- Unique `POSTGRES_PASSWORD`, `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`.
- `VITE_CLERK_PUBLISHABLE_KEY` from the same Clerk application configured for the backend.
- `MODEL_BUNDLE_URL` and `MODEL_BUNDLE_SHA256`; optional `MODEL_BUNDLE_BEARER_TOKEN` for private artifact hosting.

Edit `backend/.env.production` with the real server-only `JWT_SECRET_KEY`,
`DATA_ENCRYPTION_KEY`, Clerk issuer/JWKS and secret, `INITIAL_ADMIN_PASSWORD`,
`GEMINI_API_KEY`, and any chosen storage/security settings. Keep this file and
`.env.production.compose` out of Git. Use URL-safe characters for the PostgreSQL
password used in Compose's generated `DATABASE_URL`, or URL-encode reserved
characters before putting the password in that URL.

The example values are placeholders and must be replaced. Never put server
secrets, artifact bearer tokens, or patient data into `VITE_*` variables or a
frontend build argument.

## 2. Create and host the model bundle

Follow `MODEL_INTEGRATION_GUIDE.md`. The model ZIP must contain the final
TorchScript speech encoder and fusion model, their checksum manifests, and the
matching offline Wav2Vec2 backbone. The old research checkpoint in
`source_checkpoints/` is not a drop-in production artifact.

Run `python scripts/package_model_bundle.py` after the compatible artifacts are
installed under `ai_models/`. Upload `dist/neuromind-model-bundle.zip` to private
HTTPS artifact storage. Put its SHA-256 and download URL in
`.env.production.compose`. The deployment installer verifies the outer ZIP
checksum, both inner model checksums, model labels, feature ordering, backbone
metadata and speech/fusion lineage before installing the bundle into a named
Docker volume. API and worker containers mount that volume read-only.

## 3. Validate and start

```bash
docker compose --env-file .env.production.compose -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production.compose -f docker-compose.production.yml up --build -d
docker compose --env-file .env.production.compose -f docker-compose.production.yml ps
docker compose --env-file .env.production.compose -f docker-compose.production.yml logs --tail=100 model-artifacts backend worker frontend
```

The `model-artifacts` service must exit successfully before the API and worker
start. The API's readiness check must show database, inference, queue and report
provider ready. Run the model/preflight checks:

```bash
docker compose --env-file .env.production.compose -f docker-compose.production.yml exec backend python -m scripts.model_status
docker compose --env-file .env.production.compose -f docker-compose.production.yml exec backend python -m scripts.production_preflight
```

An admin must index the bundled knowledge PDFs using the authenticated
`POST /api/v1/rag/index` route after the stack starts. Verify semantic readiness
and citation-backed report generation before staging acceptance.

## 4. Browser acceptance tests

Use dedicated test accounts and non-sensitive test data. Confirm:

1. Patient Clerk sign-in and secure backend session exchange.
2. Speech upload, memory, attention and lifestyle submission.
3. Analysis run status and prediction persistence for both model labels.
4. Evidence retrieval, report generation, authenticated PDF download and doctor advice.
5. Doctor registration/admin approval, assigned-patient access, explicit report sharing and review.
6. Audio download authorization, care-message privacy, doctor change requests, and admin audit flows.
7. Recovery after restarting the API, worker, Redis, Chroma and database; backup and restore checks.

Do not use real patient information for smoke tests. A synthetic or dummy inference
only tests interface compatibility; it is not a clinical accuracy test. Do not
present outputs as diagnosis or release for patient use until independent
clinical validation, privacy/security review and applicable regulatory checks
are complete.

## 5. GitHub workflow

Push the source to a private GitHub repository, inspect `.gitignore` and `.dockerignore`,
and confirm `.env.production`, `.env.production.compose`, model ZIPs, weights,
patient audio and reports are not committed. The included GitHub Actions workflow
runs frontend type-check/build and backend tests. Use GitHub Actions as CI and,
if desired, to build/publish container images; use a supported container host/VM
to run the production stack. Configure repository secrets/variables only for the
specific CI or deploy job that needs them. Deployment automation to a particular
provider should be added after the target host/provider is selected.
