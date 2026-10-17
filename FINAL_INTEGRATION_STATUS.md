# NeuroMind integration handoff — prepared ZIP

## Scope of this revision

- Preserved the existing frontend source and appearance: `src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`, `Dockerfile.frontend`, and `deploy/nginx.conf` are byte-for-byte unchanged from the input ZIP.
- Added a backend-side HTTPS model-bundle installer with mandatory outer SHA-256, safe ZIP extraction, per-artifact SHA-256 checks, Wav2Vec2 metadata validation, binary class-label validation, exact fusion feature ordering, and speech/fusion lineage checks.
- Added a model-bundle packager that runs the project's Phase 1 TorchScript validator before creating a deployable ZIP.
- Updated production Compose to download the model bundle into a persistent named volume, then mount it read-only into the API and worker.
- Updated production environment examples, Docker build context exclusions, deployment docs, and the MinIO init readiness loop.
- Added three tests for the new bundle validation/extraction contract.

## Verification performed in this packaging environment

- Python compilation of the backend and training source: passed.
- New model bundle installer tests: 3 passed.
- Backend tests using the same SQLite-style environment as CI: 35 passed.
- Production Compose YAML parsed successfully and includes the model-artifacts init dependency for both API and worker.
- Frontend source preservation comparison against the input ZIP: no differences found.

The frontend dependency install/build and Docker image builds were not completed in this packaging environment. They must be verified in GitHub Actions or on the deployment host.

## Still required before production

1. Export/install the final compatible Phase 1 TorchScript speech encoder, binary fusion model, and matching offline Wav2Vec2 backbone. The source ZIP does not contain these final artifacts; its legacy checkpoint is not a drop-in replacement.
2. Run `python scripts/package_model_bundle.py` after installing the compatible artifacts. Upload the resulting ZIP to stable HTTPS artifact storage and set its URL and printed SHA-256 in `.env.production.compose`.
3. Configure real server-only secrets in `backend/.env.production` and real deployment values in `.env.production.compose`. Never commit either file.
4. Start production Compose, verify both model adapters report `READY`, run `python -m scripts.production_preflight`, index the approved RAG documents, and pass the complete browser acceptance flow in staging.
5. Choose a container host/VM for production. GitHub stores source and runs CI; GitHub Pages alone cannot host this backend, database, worker, and model inference stack.

This is a deployment-prepared ZIP, not a claim of live deployment or clinical validation. NeuroMind results must be presented as cognitive screening support, not a medical diagnosis.
