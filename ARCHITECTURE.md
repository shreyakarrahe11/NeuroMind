# NeuroMind Architecture

The supplied repository is a React 19 + Vite client. The existing routes, pages, assessment components and visual system are retained. A FastAPI + SQLAlchemy backend has been added under `backend/`.

```text
Existing React UI
   -> REST/JSON + multipart
FastAPI /api/v1
   -> PostgreSQL
   -> storage/audio and storage/reports
   -> AI model adapters
   -> SHAP
   -> RAG
   -> report generator
   -> doctor review
   -> notifications
```

The backend never exposes PostgreSQL to the browser. Role checks are enforced server-side. Doctor access requires an active assignment or an explicit report share.

The AI pipeline deliberately stops with `PENDING_MODEL` when a trained artifact is absent; it does not manufacture clinical predictions.
