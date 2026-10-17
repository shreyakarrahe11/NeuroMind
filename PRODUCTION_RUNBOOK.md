# NeuroMind deployment and acceptance runbook

NeuroMind currently implements a **binary research screening workflow**: Non-Dementia and Dementia. A class score is not a diagnosis or calibrated clinical probability. Do not accept real patient assessments until the model/data and service gates below pass.

## 1. Produce compatible, evaluated artifacts

Use `colab/Phase1_Final_Models.ipynb` with real speech from distinct patients, and real matching memory, attention and lifestyle rows for those same people. Keep patient-level train, validation and untouched test partitions separate. The older speech checkpoint is a weak baseline; the old `.keras` fusion expects a different speech size and synthetic auxiliary values. They must not be installed as a paired product model.

Run `training.validate_phase1_artifacts` and `training.install_phase1_artifacts` after reviewing the held-out results, including Dementia recall, false positives, subgroup performance and whether score calibration is appropriate. The app rejects missing or incompatible manifests and does not fill absent features with invented values.

The speech trainer now rejects a byte-identical recording under different patient IDs, masks a small fraction of training frames for robustness, and can refuse export if **predeclared** held-out macro F1 or Dementia recall gates fail. The Colab notebook includes example research gates; choose appropriate criteria before any test-set evaluation. Changing settings repeatedly against the same held-out patients invalidates the estimate. Confirm performance on a fresh external cohort and in the actual browser capture conditions before clinical release. No accuracy improvement has been measured in this ZIP.

## 2. Connect services privately

Set the **server-only** database, Clerk, JWT, encryption, object storage, Redis, Chroma and Gemini settings in `backend/.env.production`. The file must not be committed or copied into a browser bundle. Set `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` and the public origin in the frontend deployment. Review `backend/.env.production.example` for required names; its example values are placeholders. Configure HTTPS, restricted storage access, backups and retention.

From the project root, install packages with `npm install`, then backend requirements (including `backend/requirements-ai.txt`). Run `npm run db:migrate` after PostgreSQL is reachable. The production Compose stack includes separate API and Celery worker containers; use the same model artifacts and deployment settings for both.

Revision `0010_doctor_choice_audio` adds searchable doctor city/area, patient assistance request state, and `speech_audio_blobs`. New uploads save the original bytes in PostgreSQL alongside the existing S3/local object copy in one bounded upload transaction. Existing uploads need `cd backend && python -m scripts.backfill_speech_audio` after migration; resolve any missing objects reported by that command. Browsers may upload WebM or Ogg: stored bytes keep their actual format and MIME; they are **not** renamed WAV. The admin assessment explorer offers an authorized recording download with integrity verification. A separate blob table keeps routine assessment queries small. Cap uploads with `MAX_UPLOAD_MB`, size database/backups for duplicated audio, enable database encryption at rest and encrypted backups, and define a clinical data retention/deletion policy. Test restore, quota and high-concurrency uploads with your production PostgreSQL tier.

The PDF knowledge files are under `knowledge_base/`. Local development reads them through `KNOWLEDGE_BASE_PATH=../knowledge_base` from the backend directory. Compose mounts them at `/app/knowledge_base`. An approved Admin must run `POST /api/v1/rag/index` after the database and Chroma are up. Repeat indexing after replacing PDFs or restoring a Chroma volume. The index now reconciles its vectors against the database and reports semantic readiness separately from lexical search.

## 3. Run operational checks

```bash
npm run doctor
npm run models:status
npm run preflight
cd backend && python -m scripts.production_preflight --check-shap --probe-gemini
```

The preflight checks deployment settings, the current Alembic version, broker and active worker, actual Wav2Vec2 → speech → fusion execution with **dummy audio**, indexed knowledge and live Chroma, plus reachable Clerk keys. Optional switches exercise SHAP and a small Gemini request. It prints check names without exposing provider errors or secrets. Passing the dummy inference is a compatibility check, **not** a clinical accuracy test.

## 4. Exercise the complete workflow in staging

1. Use an approved patient test account to sign in through Clerk; confirm a PostgreSQL patient record is created and cookies work across the deployed frontend and API.
2. Record and upload audio in the browser, then wait for deep speech features. Submit memory, attention and lifestyle answers; confirm the expected 15 tabular features and full speech embedding exist. Replace a recording during processing to verify the old worker cannot overwrite the new features.
3. Start analysis twice; both requests should reference the same active run. Verify the exact run ID is polled and an older prediction cannot appear while this run is queued. Verify missing/invalid models show an error and no new result.
4. For held-out examples of **both** labels, inspect model probabilities, SHAP status, stored run ID, retrieved evidence, doctor guidance, **What to do** and **What to avoid** sections, report citation IDs and authenticated PDF download. A report outage should leave the saved prediction visible, and retrying generation must not create duplicate reports or notifications.
5. Have the patient browse approved doctors by area, specialty and experience, then choose one. In another account request admin help instead; verify the request appears in the admin queue and disappears after an admin assignment. Selecting a doctor must **not** share past or future reports. Share one completed report explicitly; verify only its shared doctor can view/review it and download its speech recording, a second share creates no duplicate, and unshared reports stay private. Check Admin approval and login/audit views.
6. Test recovery: stop Chroma after indexing, confirm semantic readiness fails, restart it and reindex; stop the Celery worker and verify preflight fails; restore it and complete a queued analysis. Restore PostgreSQL from a backup in staging before promoting the release.

## Current evidence and remaining gates

Python compilation, report/citation guards, PDF rendering with doctor advice, PDF text extraction and the chunker were exercised in the packaging workspace. A temporary six-row contract fixture verified the aligned fusion dataset builder and detected a modified speech CSV; it was not model training. The new patient doctor choice, audio byte storage and privacy changes require PostgreSQL integration and browser tests in staging. Backend integration tests, frontend type-check, GPU export/training, SHAP against the final artifact, live indexing and the browser staging flow require dependencies, compatible artifacts, patient-aligned real data and live credentials absent from this workspace. Do not describe this ZIP as clinically validated or fully deployed.
