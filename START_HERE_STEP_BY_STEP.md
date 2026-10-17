# NeuroMind — start here (step by step)

## First: download the project

Download `NeuroMind_PRODUCTION_PREPARED_v15.zip` from this chat and extract it on your Windows computer. An easy location is `C:\NeuroMind\NeuroMind_BINARY_WORK\`. The extracted folder should contain `README.md`, `backend/`, `src/`, `training/`, `colab/`, and `docker-compose.production.yml` directly inside it. Do not extract it into another folder with the same project contents nested twice.

**Important distinction:** this ZIP includes the website/backend integration and the code to train/package models. It does **not** include the final trained model weights, because those must be produced from your real datasets. Do not use the old `source_checkpoints/best_simple_bilstm_model.pth` as a replacement.

## Part A — create the model bundle in Google Colab

1. Open Google Drive. Upload the ZIP to the top level of **My Drive** with this exact name: `NeuroMind_PRODUCTION_PREPARED_v15.zip`.
2. Keep the datasets in a folder named `NeuroMind` (a trailing space in the folder name is okay if that is how your existing folder is named) with `01_Datasets/` inside it.
3. Check these paths. Your exact folder names may have a trailing space, but the filenames should match:

   ```text
   My Drive/
   ├── NeuroMind_PRODUCTION_PREPARED_v15.zip
   └── NeuroMind/                         # existing dataset root
       ├── 01_Datasets/
       │   ├── Speech Dataset/
       │   │   ├── Non Dementia/<patient_id>/<audio-file>
       │   │   └── Dementia/<patient_id>/<audio-file>
       │   ├── Memory Dataset/Memory_Dataset.csv
       │   ├── Attention Dataset/Attention_Dataset.csv
       │   └── Lifestyle Dataset/Lifestyle_Dataset.csv
       ├── 03_Features/                   # notebook writes derived files here
       └── 04_Models/                     # notebook writes trained files here
   ```

   The `NeuroMind` folder can be called `NeuroMind ` with a trailing space; the notebook finds either by trimming the name. Speech files must be in label/patient/file layout. Patient IDs and labels must align across speech, memory, attention, and lifestyle tables. The fusion pipeline intentionally refuses inconsistent or missing data.

4. Extract the project ZIP on your PC. Open `NeuroMind_BINARY_WORK/colab/NeuroMind_Model_Bundle_Generator.ipynb` in Google Colab using **File → Upload notebook**.
5. In Colab select **Runtime → Change runtime type → T4 GPU** (or another available GPU).
6. Run notebook cells from top to bottom. It will install training dependencies, find your datasets, extract Wav2Vec2 features, train the speech BiLSTM-attention encoder, train the multimodal Transformer, validate model compatibility, install model artifacts into the project, and create the model bundle.
7. At the end, look for this file in Drive:

   `NeuroMind/04_Models/neuromind-model-bundle.zip`

   Save the printed `MODEL_BUNDLE_SHA256` value. Keep the bundle private. The notebook may take a long time because speech feature extraction and training are compute-heavy.

### If the notebook stops

- **ZIP not found:** upload `NeuroMind_PRODUCTION_PREPARED_v15.zip` to the top level of My Drive.
- **NeuroMind folder not found:** ensure your dataset folder has `01_Datasets` directly inside it. If your datasets live elsewhere, edit `DATA_ROOT` in the notebook setup cell.
- **Speech folder not found:** check `Speech Dataset/Non Dementia/<patient_id>/...` and `Speech Dataset/Dementia/<patient_id>/...`.
- **CSV not found:** use exact filenames `Memory_Dataset.csv`, `Attention_Dataset.csv`, `Lifestyle_Dataset.csv`; if your names differ, edit the paths in the notebook data-discovery cell.
- **Fusion alignment/label error:** patient IDs or labels do not match across modalities, duplicate patient rows exist, or required website feature columns are missing. Fix the real source data; do not fabricate rows.
- **CUDA/GPU error:** change the Colab runtime to a GPU. If no GPU is available, wait for access or use a machine with a compatible GPU.
- **Metrics are weak:** the model may still be exportable for technical integration, but it is not clinically validated. Do not use it to diagnose people. Report the held-out results honestly and get supervisor approval before any real-world use.

## Part B — test the website locally (after the bundle exists)

1. Extract `NeuroMind_PRODUCTION_PREPARED_v15.zip` on your PC.
2. Extract `neuromind-model-bundle.zip` into the project's `ai_models/` folder. The resulting paths must be:

   ```text
   NeuroMind_BINARY_WORK/ai_models/speech/neuromind_speech_bilstm_attention.pt
   NeuroMind_BINARY_WORK/ai_models/speech/neuromind_speech_bilstm_attention.pt.manifest.json
   NeuroMind_BINARY_WORK/ai_models/speech/wav2vec2_backbone/...
   NeuroMind_BINARY_WORK/ai_models/multimodal/neuromind_multimodal_transformer_binary.pt
   NeuroMind_BINARY_WORK/ai_models/multimodal/neuromind_multimodal_transformer_binary.pt.manifest.json
   ```

   Important: open the model bundle ZIP and extract its **contents** into `ai_models/`; do not create `ai_models/speech/speech/` or `ai_models/multimodal/multimodal/`.
3. Open PowerShell in `NeuroMind_BINARY_WORK/` and run `npm install`, then `npm run setup`. The setup script creates the local environment files and backend virtual environment. Edit `backend/.env` and set the four model values below. Also set the required database password, authentication settings, and any API key needed for report generation. Do not paste secrets into GitHub or this chat.

   ```env
   SPEECH_MODEL_PATH=../ai_models/speech/neuromind_speech_bilstm_attention.pt
   MULTIMODAL_MODEL_PATH=../ai_models/multimodal/neuromind_multimodal_transformer_binary.pt
   WAV2VEC_MODEL_NAME=../ai_models/speech/wav2vec2_backbone
   WAV2VEC_LOCAL_FILES_ONLY=true
   ```

4. Copy `.env.example` to `.env.local` and set the frontend values. In PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   In `.env.local`, keep `VITE_API_BASE_URL=http://localhost:8000/api/v1` and set `VITE_CLERK_PUBLISHABLE_KEY` to your own Clerk test/development key.

5. Start the containerized database and backend, then the frontend:

   ```powershell
   docker compose up --build -d
   docker compose ps
   npm run dev:frontend
   ```

   Open `http://localhost:3000`. To check backend model status, open a second PowerShell window in the project root and run:

   ```powershell
   docker compose exec backend python -m scripts.model_status
   ```

6. Do not enable patient-facing assessments unless both models report `READY` and the full workflow is tested. The trained weights must remain local/private; `.gitignore` now excludes generated `ai_models/` contents from GitHub.

## Part C — GitHub and production deployment

- Push the **source code** to a private GitHub repository. Do not commit `.env`, `backend/.env`, `.env.production.compose`, patient datasets, model weights, or the model bundle.
- GitHub is for source control and CI; GitHub Pages alone cannot run this FastAPI backend, PostgreSQL database, worker, and model inference stack.
- Production requires a container host/VM and stable private HTTPS storage for the model bundle. Upload `neuromind-model-bundle.zip` to that storage, then set the URL and exact SHA-256 printed by Colab in `.env.production.compose`. Configure real backend secrets in `backend/.env.production` and never commit either environment file.
- Follow `DEPLOYMENT.md` for the full production Compose sequence. Test in staging first. Model predictions are cognitive-screening support, not a diagnosis.

## What is already prepared in this ZIP

- Existing frontend source and visual design are preserved.
- FastAPI/backend model adapters expect the binary speech and multimodal TorchScript artifacts.
- The production Compose setup verifies and downloads a private model bundle and mounts it read-only for backend and worker.
- Training, validation, installation, packaging scripts and the Colab generator notebook are included.

The ZIP is deployment-prepared source code; it is not a claim that training, clinical validation, or live hosting has already happened.
