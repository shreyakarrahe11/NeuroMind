# NeuroMind AI pipeline

The backend separates the web/API layer from model inference so trained artifacts can be added later without redesigning the application.

```text
Speech recording
  -> file validation/storage
  -> preprocessing
  -> Librosa/OpenSMILE features
  -> Whisper transcription (when configured)
  -> Wav2Vec2 representation (when configured)
  -> BiLSTM + Multi-Head Attention speech encoder
  -> versioned speech embedding persisted in PostgreSQL

Memory answers
  -> validation
  -> feature preparation
  -> memory model

Attention answers
  -> validation
  -> feature preparation
  -> attention model

Lifestyle answers
  -> validation
  -> feature preparation
  -> lifestyle model/scoring

All available modality outputs
  -> exact 15-feature contract + speech embedding
  -> binary Transformer fusion model
  -> prediction
  -> SHAP/explainability (when supported)
  -> RAG retrieval
  -> report generator/provider
  -> report persistence
  -> patient-selected doctor sharing
```

## Important

- Missing trained models are reported as `PENDING_MODEL`; no synthetic predictions are generated.
- The final fusion adapter accepts only `Non-Dementia`, `Dementia` artifacts
  with an exact feature manifest.
- The report generator is a separate integration point because final report-model training is not complete.
- RAG provides evidence/context; it does not replace the trained risk predictor.
- The LLM/report layer must not invent patient scores, evidence, or citations.
