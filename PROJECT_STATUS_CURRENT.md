# NeuroMind project status — 24 September 2026

## Goal

Binary dementia screening from recorded speech, memory, attention and lifestyle responses. The result and evidence-grounded report show Non-Dementia or Dementia screening risk, with a prompt to consult a qualified doctor for elevated risk. This is a research screening workflow, not a diagnosis.

## Done in the project

- React patient, doctor and admin pages; assessment capture; FastAPI routes; PostgreSQL models and migrations; Clerk integration code; report sharing and PDF rendering code.
- Training scripts for binary Wav2Vec2/BiLSTM/attention speech and binary fusion, with explicit feature manifests, patient-level splits, held-out metrics and ablations.
- This ZIP removes the application's three-class assumptions, adds fixed high/low follow-up guidance to generated reports, and stops the analysis page from showing a successful result when inference failed.
- Three Drive PDFs are bundled under `knowledge_base/` for indexing.
- The earlier Colab binary simple BiLSTM checkpoint is bundled as a **source checkpoint**, not installed as a deployable model; see `BINARY_INTEGRATION_STATUS.md`.
- Production hardening in this release: exact analysis-run polling, serialized duplicate submissions, stale-run recovery, recording replacement protection, speech-to-fusion model hash lineage and a database migration, report generation concurrency control, bounded citation validation, safer PDF text, recoverable Chroma reconciliation, and a service/model preflight command. See `PRODUCTION_RUNBOOK.md`.
- Patient-led choice from approved doctor profiles (city, area, specialty, qualifications, experience), explicit admin-assistance requests, and PostgreSQL retention of uploaded original audio with an authorized download; existing recordings require a backfill. Doctor access to assessment results and audio now requires a patient report share.

### Doctor choice and patient data status (revision 0010)

| Area | Implemented in this ZIP | Still required before real patients |
| --- | --- | --- |
| Patient care team | Approved doctor directory, patient choice, admin help queue, existing doctor change requests | Run role and browser tests with real accounts; verify clinician identity and profile details |
| PostgreSQL | Profiles, raw memory/attention/lifestyle answers, reports, original audio bytes, speech prompt metadata | Migrate database and backfill old audio; test backup/restore, limits and deletion policy |
| Consent | Explicit share and revoke; doctor report, assessment and audio access checked on each request | Stage a complete share/revoke test and review all care permissions |
| Speech accuracy | Patient-disjoint training, duplicate audio checks, optional training masking and predeclared release gates | Execute GPU training on real patient speech; verify fresh held-out, external and subgroup metrics |

The test environment used for this ZIP lacks PostgreSQL, FastAPI, Torch, and frontend packages, so these new routes and screens have **not** passed live integration tests or clinical validation.
- Both report paths now append practical, class-specific **What to do** and **What to avoid** steps; the downloaded PDF includes them. Live report generation still depends on Gemini, indexed evidence and a compatible trained model.

## Pending before a real full assessment works

1. On a GPU runtime with the matching Wav2Vec2 backbone, train/evaluate the binary attention speech model, or export and test the older, weak simple BiLSTM baseline; install only a verified TorchScript artifact.
2. Provide **real, aligned** memory, attention and lifestyle inputs for the **same patients** as the speech recordings, using the website's exact 15 features and units. Train/evaluate binary fusion using speech embeddings from the installed speech model. The older `.keras` fusion checkpoint cannot be installed directly because its 768 input values do not match the new speech representation and its auxiliary table is synthetic.
3. With the trained fusion model, check SHAP, probabilities, thresholds and patient-level held-out performance. No validated performance is asserted by this ZIP.
4. Run the admin RAG index against the bundled PDFs after connecting PostgreSQL/Chroma. Configure Gemini to exercise report generation; verify PDF and citations on a real report.
5. Set PostgreSQL, Clerk, Gemini and deployment secrets in the deployment environment. Run migrations, model readiness checks, browser patient → result → report → doctor flow, and privacy/security/clinical review before use with real patients.

## Honest status

| Area | Status |
| --- | --- |
| Screens and server workflow | Hardened code present; live flow not verified here |
| Binary speech | Old checkpoint present, export/evaluation pending |
| Binary fusion | Training code ready; aligned real training data/artifact pending |
| SHAP | Code present; needs working fusion model |
| Knowledge files | Three PDFs bundled; index pending |
| Gemini report and PDF | Code and fixed doctor guidance present; provider and live PDF test pending |
| Full patient-to-doctor flow | Pending live database, keys, models and testing |
