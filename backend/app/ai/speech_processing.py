import logging

from sqlalchemy import delete, select

from ..core.database import SessionLocal
from ..models.entities import SpeechAssessment, SpeechFeature
from .feature_extraction.librosa_features import extract_librosa_features
from .embeddings.wav2vec_service import wav2vec_service
from .models.speech_model import SpeechModelService
from ..services.model_artifact_service import register_model_artifact
from ..services.object_storage import object_storage


logger = logging.getLogger("neuromind.speech")


def process_speech_assessment(speech_assessment_id, audio_path: str):
    """Decode an upload and persist real acoustic measurements in the database."""
    db = SessionLocal()
    row = db.get(SpeechAssessment, speech_assessment_id)
    if not row or row.audio_file_path != audio_path:
        db.close()
        return
    stage = "AUDIO_DECODE"
    try:
        row.preprocessing_status = "PROCESSING"
        row.feature_extraction_status = "PROCESSING"
        row.processing_error_code = None
        db.commit()

        import librosa

        with object_storage.local_path(audio_path) as local_audio_path:
            audio, sample_rate = librosa.load(local_audio_path, sr=16000, mono=True)
        if audio.size == 0:
            raise ValueError("Decoded audio is empty")
        acoustic_values = extract_librosa_features(audio, sample_rate)
        acoustic_values["duration_seconds"] = float(librosa.get_duration(y=audio, sr=sample_rate))

        feature_rows = [
            (name, float(value), "acoustic") for name, value in acoustic_values.items()
        ]
        speech_model = SpeechModelService()
        if speech_model.status().value == "READY":
            stage = "MODEL_FEATURE_EXTRACTION"
            register_model_artifact(db, speech_model)
            # The Colab baseline used an eight-second input. Other artifacts
            # may declare a different duration; keep inference aligned with
            # the manifest used for their training/export.
            max_seconds = speech_model.manifest.get("max_audio_seconds")
            model_audio = audio[:int(float(max_seconds) * sample_rate)] if max_seconds else audio
            hidden_states = wav2vec_service().embed_sequence(model_audio, sample_rate)
            encoded = speech_model.encode_sequence(hidden_states)
            feature_rows.extend(
                (f"embedding_{index}", float(value), "deep_speech_embedding")
                for index, value in enumerate(encoded["embedding"])
            )
            for label, probability in encoded["class_probabilities"].items():
                safe_label = "".join(
                    character if character.isalnum() else "_" for character in label.lower()
                ).strip("_")
                feature_rows.append(
                    (f"class_probability_{safe_label}", float(probability), "speech_model_output")
                )

        # A patient may replace the recording while extraction is running.
        # Never write features from an older audio object onto the new upload.
        row = db.scalar(
            select(SpeechAssessment).where(SpeechAssessment.id == row.id)
            .with_for_update().execution_options(populate_existing=True)
        )
        if row.audio_file_path != audio_path:
            db.rollback()
            return
        db.execute(delete(SpeechFeature).where(SpeechFeature.speech_assessment_id == row.id))
        for name, value, group in feature_rows:
            db.add(SpeechFeature(
                speech_assessment_id=row.id,
                feature_name=name,
                feature_value=float(value),
                feature_group=group,
            ))
        row.sample_rate = int(sample_rate)
        row.duration_seconds = acoustic_values["duration_seconds"]
        row.preprocessing_status = "COMPLETED"
        row.feature_extraction_status = (
            "COMPLETED" if speech_model.status().value == "READY" else "ACOUSTIC_ONLY"
        )
        row.speech_artifact_sha256 = (
            speech_model.manifest.get("artifact_sha256")
            if row.feature_extraction_status == "COMPLETED" else None
        )
        db.commit()
    except Exception:
        logger.exception("Speech processing failed for assessment %s", speech_assessment_id)
        db.rollback()
        row = db.get(SpeechAssessment, speech_assessment_id)
        if row and row.audio_file_path == audio_path:
            row.preprocessing_status = "FAILED"
            row.feature_extraction_status = "FAILED"
            row.processing_error_code = f"{stage}_FAILED"
            db.commit()
    finally:
        db.close()
