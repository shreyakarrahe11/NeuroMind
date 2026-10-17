# PostgreSQL setup for NeuroMind

PostgreSQL database names are case-sensitive when created with quoted mixed
case. If pgAdmin shows `Neuromind`, the final segment of `DATABASE_URL` must be
`/Neuromind`; `/neuromind` is a different name. `npm run doctor` checks the
database itself, and `npm run db:migrate` safely creates it when it is genuinely
missing and the configured PostgreSQL role has `CREATEDB` permission.

## What you are connecting

```text
React frontend
   -> FastAPI backend
      -> SQLAlchemy
         -> PostgreSQL
            -> database: neuromind
```

The browser must never receive the PostgreSQL password or `DATABASE_URL`.

## Install

Install PostgreSQL for Windows with pgAdmin 4. Keep the PostgreSQL server and command-line tools enabled. The default PostgreSQL port is `5432`.

## Create the database

In pgAdmin:

`Servers -> PostgreSQL -> Databases -> Create -> Database`

Use:

```text
Database: neuromind
Owner: postgres
```

## Backend environment

Create `backend/.env` from `backend/.env.example` and set:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/neuromind
```

Replace `YOUR_PASSWORD` with the password you selected when PostgreSQL was
installed. Do not type angle brackets around it. For example, if the local
password is `MyPassword123`, use:

```env
DATABASE_URL=postgresql+psycopg://postgres:MyPassword123@localhost:5432/neuromind
```

Do not send or commit your real password. The generated `backend/.env` is
ignored by Git.

If your PostgreSQL password contains special URL characters, URL-encode them or create a dedicated application role with a simple password for local development.

## Create schema

Do not manually create the NeuroMind tables in pgAdmin. From the project root,
run the checks and Alembic migration through npm so the correct virtual
environment and backend directory are selected on Windows:

```powershell
npm run doctor
npm run db:migrate
```

Then start the full application:

```powershell
npm run dev
```

`npm run dev` starts both FastAPI and Vite, runs migrations, and synchronizes
the configured development Admin account.

## Common errors

- `YOUR_POSTGRES_PASSWORD` message: edit `backend/.env`; the placeholder is
  still present.
- `password authentication failed for user "postgres"`: the password in
  `DATABASE_URL` does not match PostgreSQL.
- `database "neuromind" does not exist`: create the `neuromind` database in
  pgAdmin, owned by `postgres`.
- `connection refused`: start the PostgreSQL Windows service and confirm it is
  listening on port `5432`.
- Password contains `@`, `:`, `/`, `%`, `#`, or `?`: URL-encode the password or
  use a simple letters-and-numbers password for the local development role.

This creates the full schema including users, patients, doctors, assignments, assessments, speech metadata/features, predictions, SHAP explanations, RAG metadata, reports, doctor reviews, notifications and audit logs.

## Verify

In pgAdmin:

`neuromind -> Schemas -> public -> Tables`

Expected core tables:

```text
users
patient_profiles
doctor_profiles
doctor_patient_assignments
assessment_sessions
speech_assessments
speech_features
speech_transcriptions
memory_assessments
attention_assessments
lifestyle_assessments
model_runs
predictions
explanations
knowledge_documents
knowledge_chunks
reports
report_evidence
report_shares
doctor_reviews
notifications
audit_logs
```

## Data storage rule

Structured patient/assessment/model/report data is stored in PostgreSQL.

Large files such as recordings are stored under the configured storage directory; PostgreSQL stores their path and metadata. This prevents the relational database from becoming an audio blob store.
