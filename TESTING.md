# NeuroMind testing

## Backend syntax

```powershell
python -m compileall backend/app backend/scripts
```

## Full connection check

```powershell
npm run doctor
npm run check
```

`npm run check` intentionally fails if PostgreSQL is unavailable. A missing
trained multimodal model is reported as information, not replaced with mock data.

## Backend tests

```powershell
cd backend
pytest
```

## Required integration checks

1. PostgreSQL connection (run locally with your real PostgreSQL credentials)
2. Alembic migration
3. Admin bootstrap
4. Clerk patient exchange
5. Doctor registration -> pending
6. Admin notification
7. Admin approval
8. Doctor login
9. Doctor-patient assignment
10. Patient assessment persistence
11. Speech object storage + metadata
12. Speech media decoding + deep-feature completion gate
13. Redis/Celery AI job lifecycle
14. Model missing/pending handling
15. RAG indexing/retrieval
16. Report persistence and evidence linkage
17. Patient-controlled report share + doctor notification
18. Admin login audit + last-login timestamp
19. Logout access/refresh token revocation
20. Doctor review
21. Patient report access and authenticated PDF download
22. Production configuration rejects placeholder secrets and single-process services
23. Rate-limit enforcement returns HTTP 429 with `Retry-After`
24. Admin audit trail returns actor, entity, action, and bounded pagination
25. Fresh Alembic upgrade reaches `0008_speech_error_code`
26. Speech worker failures return safe support codes without leaking exceptions
