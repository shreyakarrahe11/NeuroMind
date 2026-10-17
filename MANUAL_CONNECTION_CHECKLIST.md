# NeuroMind manual connection checklist

This project is designed so the remaining machine-specific setup is explicit rather than hidden.

## PostgreSQL

- [ ] Run `npm install` and `npm run setup` from the project root.

- [ ] Install PostgreSQL + pgAdmin 4.
- [ ] Create database `neuromind`.
- [ ] Set `backend/.env -> DATABASE_URL`.
- [ ] Run `npm run doctor`.
- [ ] Run `npm run db:migrate` and `npm run db:admin` (or let `npm run dev` apply migrations).

## Clerk patient authentication

- [ ] Create/configure the Clerk application.
- [ ] Put the publishable key in `VITE_CLERK_PUBLISHABLE_KEY`.
- [ ] Configure backend Clerk JWT verification (`CLERK_JWT_KEY`, issuer/authorized parties as needed by the Clerk application).
- [ ] Put the server-only Clerk secret key in `backend/.env -> CLERK_SECRET_KEY`
  so patient identity lookup still works when the session token has no custom
  email claim. Never put this key in a frontend `VITE_*` variable.
- [ ] Verify a patient can sign up/sign in through Clerk.
- [ ] Verify `/api/v1/auth/clerk/exchange` creates/synchronizes the patient in PostgreSQL.
- [ ] Optional optimization: add verified `email`, `first_name`, and
  `last_name` session claims. Without them, the server-only Clerk API fallback
  supplies the primary email. The backend never trusts a browser-supplied
  email.

## Admin

Default local-development bootstrap values come from environment/configuration. Run the bootstrap script instead of public admin registration.

## Doctor

- [ ] Doctor registers using the existing Doctor Registration page.
- [ ] Verify a `PENDING` doctor record is created.
- [ ] Verify an admin notification is created.
- [ ] Admin approves the doctor.
- [ ] Doctor then uses the registered email/password to sign in.

## Trained models

Phase 1 requires two trained artifacts plus the exact offline Wav2Vec2 backbone:

```text
ai_models/speech/neuromind_speech_bilstm_attention.pt -> SPEECH_MODEL_PATH
ai_models/speech/wav2vec2_backbone/                   -> WAV2VEC_MODEL_NAME
ai_models/multimodal/neuromind_multimodal_transformer_binary.pt -> MULTIMODAL_MODEL_PATH
```

Memory, attention, and lifestyle are validated assessment-score pipelines that
feed the final fusion model; their standalone adapters are optional, not
missing Phase 1 requirements. Use `training.install_phase1_artifacts`, keep the
generated manifests beside the artifacts, and run `npm run models:status`. Both
speech and multimodal must show `READY`. Do not claim validation until a real
held-out inference test passes.

## RAG

- [ ] Place approved `.txt`, `.md`, or `.pdf` knowledge documents under `knowledge_base/`.
- [ ] Run the admin-only RAG indexing endpoint.
- [ ] Verify `knowledge_documents` and `knowledge_chunks` contain real documents/chunks.
- [ ] Run `npm run setup:ai` so ChromaDB is installed.
- [ ] Verify the index response reports `semanticIndexReady: true`; lexical fallback is clearly marked when Chroma is unavailable.
- [ ] In production set `CHROMA_HOST` to the shared Chroma service; do not use
  separate local persistent indexes across multiple workers.

## Report generation

- [ ] Configure `GEMINI_API_KEY` and `GEMINI_MODEL` for the current evidence-grounded provider adapter.
- [ ] Keep `REQUIRE_RAG_EVIDENCE_FOR_REPORT=true` in production.
- [ ] Verify citations refer only to indexed `report_evidence` chunks and PDF download succeeds.

## Frontend API wiring

The existing UI is already preserved. Any remaining API work should be limited to mapping existing screens/components to the documented backend routes. Do not redesign the UI.

## Patient-controlled report sharing
After a report is generated and visible to the patient, the patient chooses an approved doctor in the existing **Share with Doctor** action. The backend records a `report_shares` row and immediately creates a notification for that doctor. Reports are not automatically shared merely because a doctor is assigned.

## Admin login visibility
The admin user directory shows each account's last successful login. The recent login activity panel also records successful/failed local sign-ins and Clerk patient session exchanges with timestamps.

## Production deployment

- [ ] Copy `backend/.env.production.example` to `backend/.env.production` without committing it.
- [ ] Set a unique PostgreSQL password, 32+ character JWT secret, Fernet
  data-encryption key, Clerk values, Gemini key, production Admin password,
  public origin, and Clerk publishable key
  in the deployment secret manager.
- [ ] Keep `AUTH_RETURN_TOKENS=false`, serve the frontend/API from the same
  HTTPS site (normally sibling subdomains), and verify the Secure HttpOnly
  session cookies are accepted without exposing tokens to browser JavaScript.
- [ ] Configure Redis/Celery (`TASK_QUEUE_MODE=celery`, `REDIS_URL`) so model
  inference survives API restarts and does not block web workers.
- [ ] Configure S3-compatible object storage (`STORAGE_BACKEND=s3`, bucket,
  endpoint/region, and workload identity or access keys). The supplied compose
  stack uses MinIO; a cloud deployment can use AWS S3 or an equivalent service.
- [ ] Configure shared Chroma and index only reviewed, licensed knowledge files.
- [ ] Install the final model artifacts and approved knowledge documents before
  bringing up `docker-compose.production.yml`.
- [ ] Confirm the saved `wav2vec2_backbone` directory is mounted with the model
  artifacts and `WAV2VEC_LOCAL_FILES_ONLY=true`.
- [ ] Configure HTTPS, backups, monitoring/alerts, log retention, and a restore drill.
- [ ] Run CI, database migrations, a staging Clerk login, and a complete held-out
  assessment before promoting to production.
