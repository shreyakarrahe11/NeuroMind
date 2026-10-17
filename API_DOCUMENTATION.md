# NeuroMind API documentation

The complete interactive API is available from FastAPI at `/docs` once the backend is running.

Core route groups:

```text
/auth
/users
/patients
/doctors
/admin
/assessments
/speech
/ai
/reports
/rag
/notifications
/care
```

Authentication uses NeuroMind JWTs for doctor/admin/local backend access and exchanges Clerk patient sessions into a NeuroMind backend session.

Readiness and model inspection:

```text
GET /health/live
GET /health/ready
GET /api/v1/ai/models/status   (authenticated)
```

Patient password registration is disabled; patients enter through Clerk only.

## Assessment telemetry

`GET /assessments/{assessment_id}/events` returns normalized memory/attention
events after the normal role/assignment authorization check. Target clicks,
reaction-time trials, digit-span trials, timestamps, and elapsed time are
stored in PostgreSQL.

## Care center

- `GET /care/contacts`
- `GET /care/messages/{counterpart_user_id}`
- `POST /care/messages`
- `GET|POST /care/doctor-change-requests`
- `PUT /care/doctor-change-requests/{request_id}` (Admin)
- `POST /care/ratings`
- `GET /care/doctors/{doctor_user_id}/rating`

Messages require an active patient-doctor assignment. Doctor changes are
admin-resolved and audited. Ratings are limited to the currently assigned
doctor.


## Patient-controlled report sharing
`POST /patients/me/reports/{report_id}/share` accepts `{ "doctor_id": "..." }`. The backend verifies the report belongs to the patient, is ready, and the doctor is approved. It creates a `report_shares` row and an in-app doctor notification immediately. Generation does not automatically share the report; the patient chooses the doctor.

## Admin login audit
`GET /admin/login-activity?limit=100` returns recent successful and failed login events, with recorded timestamps and provider information. `users.last_login_at` contains each user's most recent successful login.

## Reports and RAG

`POST /rag/index` is Admin-only and indexes `.txt`, `.md`, and `.pdf` files.
Chroma semantic retrieval is used when available; an explicitly labeled
lexical retrieval fallback remains available when the vector runtime is not
installed. `GET /reports/{report_id}/download` returns an authenticated PDF.
