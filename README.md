# NeuroMind

> **New here?** Follow [START_HERE_STEP_BY_STEP.md](START_HERE_STEP_BY_STEP.md) and run [the Colab model-bundle generator](colab/NeuroMind_Model_Bundle_Generator.ipynb) to create the trained artifacts from your real datasets. Model weights are not included in this source ZIP.


NeuroMind is an AI-assisted dementia risk assessment platform with three application roles: Patient, Doctor, and Admin. The existing React interface is preserved; the backend provides the real data, authentication, assessment, AI orchestration, RAG, report workflow, doctor assignment, notifications, and persistence.

## Architecture

```text
Existing React UI
      |
      v
FastAPI /api/v1
      |
      +--> PostgreSQL (SQLAlchemy + Alembic)
      +--> Redis -> Celery AI workers (production)
      +--> Redis-backed route abuse protection
      +--> S3-compatible object storage (audio)
      +--> Checksum-verified AI artifacts
      +--> Chroma semantic index + PostgreSQL source records
      +--> Evidence-grounded Gemini report generation
      +--> Secure care messages / doctor-change workflow
      +--> Administrative audit trail + request timing
```

### Authentication model

- Patient: Clerk sign-in/sign-up. The Clerk session is exchanged for a NeuroMind backend session and synchronized to a PostgreSQL patient record.
- Doctor: local email/password account created as `PENDING`; admin approves it before the account can log in.
- Admin: fixed local bootstrap account synchronized by `npm run db:admin`. Public admin registration is disabled.
- One account maps to one backend role.
- Logout increments a per-user token version, immediately revoking issued
  NeuroMind access and refresh tokens.
- The browser stores session tokens only in HttpOnly, SameSite cookies. Set
  `AUTH_RETURN_TOKENS=false` in production so JavaScript responses never expose
  them; authenticated fetches already use `credentials: include`.

## Recommended local setup

Prerequisites: Node.js 20+, Python 3.11+, and PostgreSQL 15+.

From the project root:

```bash
npm install
npm run setup
```

Edit `backend/.env` with your PostgreSQL password and Clerk values, then run:

```bash
npm run db:migrate
npm run db:admin
npm run doctor
npm run dev
```

`npm run dev` starts both FastAPI (`:8000`) and the preserved Vite UI (`:3000`)
applies migrations, synchronizes the configured local Admin, and stops both
processes together. `npm start` is an alias for the same local
development command. Run `npm run models:status` to inspect every AI adapter.

The local Admin email and setup-generated password are stored only in
`backend/.env`; the frontend never embeds or autofills them. See
`ADMIN_AND_DOCTOR_LOGIN.md` for the complete
Doctor registration → Admin approval → Doctor login flow.

## Phase 1 final AI models

The repository includes a reproducible GPU training pipeline for the final
Wav2Vec2 → BiLSTM → Multi-Head Attention speech encoder and the final
Non-Dementia/Dementia Transformer fusion model. It includes patient-level
splits, early stopping, class weighting, artifact manifests, integrity hashes,
held-out evaluation and seven ablation experiments.

The export also saves the exact offline Wav2Vec2 backbone used for feature
extraction. Production readiness requires that backbone, the speech artifact,
and the fusion artifact to pass their cross-manifest contracts.

See `PHASE1_AI_COMPLETION.md` and run the prepared
`colab/Phase1_Final_Models.ipynb` notebook against the approved Drive data.
For deployment checks and the patient-to-doctor acceptance flow, follow
`PRODUCTION_RUNBOOK.md`. Fusion training now requires the exact speech artifact
that created the patient embedding CSV and its provenance manifest.
After installing the trained artifacts, run:

```bash
npm run setup:ai
npm run models:status
```

The backend requires a binary fusion model with an exact feature manifest.

For a containerized database and backend, run `docker compose up --build`, then
run the frontend with `npm run dev:frontend`.

For the production-style full stack (PostgreSQL, Redis/Celery, MinIO/S3,
Chroma, FastAPI, Vite build, and Nginx), prepare both environment files and a
validated model bundle. The frontend source and visual design are unchanged.

```bash
cp .env.production.compose.example .env.production.compose
cp backend/.env.production.example backend/.env.production
# Edit both files; never commit the real files.
# The model bundle must be uploaded to stable HTTPS artifact storage first.
docker compose --env-file .env.production.compose -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production.compose -f docker-compose.production.yml up --build -d
```

The `model-artifacts` init service downloads the model bundle, checks the ZIP
SHA-256, each model checksum, the Wav2Vec2 metadata, class labels, embedding
size, and exact fusion feature order, then installs the files into a persistent
Docker volume shared read-only by the API and worker. The service fails closed
if the URL, checksum, manifest, or model contract is invalid. See
`MODEL_INTEGRATION_GUIDE.md` and `DEPLOYMENT.md` for bundle creation and hosting.

## Manual local setup

### 1. PostgreSQL

Create a PostgreSQL database named `neuromind` and note the `postgres` username/password. See `POSTGRES_SETUP.md`.

### 2. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Set the PostgreSQL connection and Clerk values in `backend/.env`.

For the Clerk application already configured in the frontend, use:

```env
CLERK_ISSUER=https://noble-drake-90.clerk.accounts.dev
CLERK_AUTHORIZED_PARTIES=http://localhost:3000,http://localhost:5173
CLERK_SECRET_KEY=sk_test_your_server_only_key
```

`CLERK_ISSUER` enables secure verification through Clerk's rotating JWKS keys.
`CLERK_JWT_KEY` may remain empty unless you intentionally want offline PEM-key
verification. Add the deployed frontend origin to `CLERK_AUTHORIZED_PARTIES`
before deployment.

`CLERK_SECRET_KEY` is server-only and enables a secure Backend API fallback:
when the signed session token does not contain an email claim, NeuroMind looks
up the user identified by the already-verified Clerk `sub` claim and uses that
account's primary email. Never place this key in a `VITE_*` variable or commit
it to source control. A custom `email` session claim remains supported and
avoids the additional Backend API request.

If patient sign-in reports that the Clerk signing key cannot be verified, run
`npm run setup` again to install the RSA/cryptography dependency, then run
`npm run doctor`. The doctor now checks both the cryptography package and the
Clerk JWKS endpoint. If the endpoint is blocked on the local network, copy the
JWT verification public key from the same Clerk application into
`CLERK_JWT_KEY` using literal `\\n` between PEM lines, then restart `npm run dev`.
For safest first-time email linking, add a verified email claim to the Clerk
session token; the backend will not attach an unverified browser-supplied email
to an existing account.

Run migrations:

```powershell
alembic upgrade head
```

Create the admin bootstrap account:

```powershell
npm run db:admin
```

Run the API:

```powershell
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### 3. Frontend

From the repository root:

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Set:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_ENABLE_CLERK=true
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

Patient authentication uses Clerk. Doctor and Admin authentication continues
to use the NeuroMind backend's role-based email/password flow.

## Doctor workflow

```text
Doctor registration
  -> pending account + admin notification
  -> admin review/approval
  -> account activated
  -> doctor logs in with the registered email/password
  -> doctor can access assigned patients only
```

## Patient workflow

```text
Clerk sign-in
  -> backend sync
  -> assessment session
  -> memory + attention + lifestyle + speech
  -> AI job
  -> prediction + explainability
  -> RAG evidence
  -> report generation when configured
  -> patient chooses an approved doctor -> immediate secure report share + doctor notification
  -> doctor review
  -> patient views final report/review
  -> patient and assigned doctor can exchange secure care messages
  -> patient can rate the assigned doctor or submit an auditable change request
```

## Model status

The project contains checksum-verified model adapters, but trained artifacts are intentionally not bundled. When a trained artifact is available, place it under `ai_models/<module>/` and set its corresponding environment variable. Do not replace missing models with fake predictions.

Report generation uses Gemini only when configured and, by default, only after
approved RAG evidence is retrieved. Generated reports include persisted
evidence references and can be downloaded as authenticated PDFs.
Care-message bodies are field-encrypted when `DATA_ENCRYPTION_KEY` is set;
production startup rejects a missing encryption key.

See:

- `DATABASE_SCHEMA.md`
- `API_DOCUMENTATION.md`
- `API_INTEGRATION_GUIDE.md`
- `AI_PIPELINE.md`
- `MODEL_INTEGRATION_GUIDE.md`
- `MANUAL_CONNECTION_CHECKLIST.md`
- `POSTGRES_SETUP.md`
- `TESTING.md`
- `PROJECT_STATUS_CURRENT.md`


### Sharing and login governance
Patients choose an approved doctor from the Report/Results share action; after confirmation the backend records the share and notifies the chosen doctor. Admins can activate/suspend accounts and inspect recent login activity and last-login timestamps.
