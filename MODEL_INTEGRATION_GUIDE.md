# NeuroMind model integration guide

The backend is fully wired for real artifacts, but trained weights are not
invented or bundled. Until a real multimodal artifact is configured, the API
returns `PENDING_MODEL` instead of a fake medical result.

## Directory layout

```text
ai_models/
├── speech/
│   ├── neuromind_speech_bilstm_attention.pt
│   ├── neuromind_speech_bilstm_attention.pt.manifest.json
│   └── wav2vec2_backbone/
└── multimodal/
    ├── neuromind_multimodal_transformer_binary.pt
    └── neuromind_multimodal_transformer_binary.pt.manifest.json
```

## Environment variables

```env
SPEECH_MODEL_PATH=
MULTIMODAL_MODEL_PATH=
WAV2VEC_MODEL_NAME=
WAV2VEC_LOCAL_FILES_ONLY=true
```

## What to do with a trained model

1. Run the Phase 1 Colab pipeline and its artifact validator.
2. Install both artifacts and the saved Wav2Vec2 backbone with
   `training.install_phase1_artifacts`.
3. Keep `<artifact-name>.manifest.json` beside the artifact. Its
   `input_features` order and `class_labels` must exactly match training.
4. Set its path in `backend/.env`, for example:

   ```env
   MULTIMODAL_MODEL_PATH=../ai_models/multimodal/model.joblib
   ```

5. Install the optional runtime used by the artifact:

   ```bash
   backend/.venv/bin/python -m pip install -r backend/requirements-ai.txt
   ```

   On Windows use `backend\.venv\Scripts\python`.
6. Run `npm run models:status`; both speech and multimodal must show `READY`.
7. Use a held-out real sample for an inference smoke test and verify the two
   class probabilities (`Non-Dementia`, `Dementia`) sum to approximately 1.

## Supported artifact formats

The generic adapter supports these formats when their optional runtimes are installed:

```text
.joblib / .pkl
.pt / .pth
.keras / .h5
.onnx
```

Raw PyTorch state dictionaries and Transformers/Safetensors checkpoints still
need their exact architecture/tokenizer code; export TorchScript or ONNX for a
drop-in artifact.

## Speech features

The speech worker loads the saved offline Wav2Vec2 backbone, passes its frame
representations through the trained BiLSTM-attention encoder, and persists each
`speech_embedding_*` dimension required by fusion. The backbone source and
hidden size must match the speech manifest. The server rejects mismatches and
never fills missing features with synthetic values.

## Report-generation model

The report path uses Gemini with required RAG evidence; no separately trained
report model is required for the current architecture. If a future validated
local report model replaces Gemini, connect it behind the existing interface
without changing the database/report workflow.


## Production: connect a hosted model bundle URL

The model files run on the **backend**, not in the browser. Do not place model
URLs in `VITE_*` variables, do not expose model credentials to the frontend,
and do not commit trained weights or the bundle ZIP to GitHub.

### 1. Required bundle structure

Create a ZIP whose root contains these directories (no enclosing project folder):

```text
speech/
  neuromind_speech_bilstm_attention.pt
  neuromind_speech_bilstm_attention.pt.manifest.json
  wav2vec2_backbone/
    config.json
    neuromind_backbone.json
    preprocessor_config.json
    tokenizer_config.json
    vocab.json
    model.safetensors   # or pytorch_model.bin
    ...other files created by save_pretrained(...)
multimodal/
  neuromind_multimodal_transformer_binary.pt
  neuromind_multimodal_transformer_binary.pt.manifest.json
```

Both `.pt` files must be **TorchScript exports**, not raw PyTorch state dictionaries.
The manifests must contain artifact checksums, the two canonical labels
`["Non-Dementia", "Dementia"]`, the correct tasks, the exact fusion feature
order, the fusion `speech_artifact_sha256` matching the speech artifact, and
`background_values` for every fusion feature. The backbone metadata must match
the speech manifest's Wav2Vec2 source and hidden size. Do not substitute the
older `source_checkpoints/best_simple_bilstm_model.pth` or unrelated model files.

### 2. Validate and package the bundle

After running the approved Phase 1 notebook and installing the compatible
artifacts with `training.install_phase1_artifacts`, run from the project root:

```bash
python scripts/package_model_bundle.py
```

The script invokes `training.validate_phase1_artifacts`, checks the exact
backbone files and fusion background values, and writes
`dist/neuromind-model-bundle.zip`. It prints `MODEL_BUNDLE_SHA256=...` for the
whole ZIP. If validation fails, it does not create a bundle.

### 3. Host it privately

Upload the ZIP to a stable HTTPS artifact endpoint that supports a direct file
download, such as private object storage or a private model repository. Do not
use a preview/share page that returns HTML instead of the ZIP. The production
installer supports an optional HTTP Bearer token through
`MODEL_BUNDLE_BEARER_TOKEN`; redirects must remain HTTPS, and authorization is
not forwarded to a different hostname. Keep that token in deployment secrets.

### 4. Configure Compose

In `.env.production.compose`, set:

```env
MODEL_BUNDLE_URL=https://your-private-artifact-host/path/neuromind-model-bundle.zip
MODEL_BUNDLE_SHA256=<the exact 64-character hash printed by the packager>
MODEL_BUNDLE_BEARER_TOKEN=<optional private-artifact bearer token>
```

Use the real checksum; do not leave placeholders. Set the app's actual server
secrets and Clerk/Gemini configuration in `backend/.env.production`. Start the
stack with `docker compose --env-file .env.production.compose -f
docker-compose.production.yml up --build -d`. A one-shot `model-artifacts`
service verifies and installs the bundle into a named volume. The API and
Celery worker mount that volume read-only. The browser only calls the API at
`/api/v1`; it never downloads model weights.

### 5. Verify before release

```bash
docker compose --env-file .env.production.compose -f docker-compose.production.yml ps
docker compose --env-file .env.production.compose -f docker-compose.production.yml exec backend python -m scripts.model_status
docker compose --env-file .env.production.compose -f docker-compose.production.yml exec backend python -m scripts.production_preflight
```

Do not enable patient assessments unless both `speech` and `multimodal` are
`READY`, the real Wav2Vec2 → speech → fusion smoke test passes, RAG is indexed,
and the patient-to-doctor/report browser workflow passes in staging. A passing
compatibility check is not evidence of clinical validity. Treat every output as
screening support, not a diagnosis.
