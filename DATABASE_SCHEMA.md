# NeuroMind PostgreSQL schema

## Identity and access

```text
users
patient_profiles
 doctor_profiles
 doctor_patient_assignments
```

## Assessments

```text
assessment_sessions
speech_assessments
speech_features
speech_transcriptions
memory_assessments
attention_assessments
lifestyle_assessments
assessment_events
```

## AI

```text
model_runs
model_artifacts
predictions
explanations
```

## RAG/reporting

```text
knowledge_documents
knowledge_chunks
reports
report_evidence
report_shares
doctor_reviews
doctor_ratings
```

## Operations

```text
notifications
audit_logs
login_events
care_messages
doctor_change_requests
```

Assessment data is grouped by `assessment_sessions.id`. Raw patient answers
remain on each modality row while important click/trial events are normalized
in `assessment_events` with sequence, wall-clock time, elapsed milliseconds,
and payload. Speech binaries are stored in file/object storage; PostgreSQL
stores path/metadata and all structured derived data.

`speech_assessments.processing_error_code` stores a bounded support code such
as `AUDIO_DECODE_FAILED`, `MODEL_FEATURE_EXTRACTION_FAILED`, or
`QUEUE_UNAVAILABLE`. Raw worker exceptions are logged server-side and are not
returned to patients. Transcription is marked `NOT_REQUIRED` because the
current speech pipeline uses acoustic and Wav2Vec2 features, not transcript
content.

Production uses S3-compatible object references so API and Celery instances
share the same audio. Care-message bodies use application-level Fernet
encryption when configured. `users.token_version` supports immediate logout
revocation of both access and refresh tokens.
