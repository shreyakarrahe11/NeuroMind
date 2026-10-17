from datetime import datetime, timezone
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.config import settings
from .base import PendingModelError
from .models.multimodal_model import MultimodalModelService
from .models.speech_model import SpeechModelService
from .explainability.shap_service import SHAPService
from .rag.retriever import rag
from .llm.report_generator import report_generator
from .llm.followup import append_followup
from .feature_contract import build_multimodal_features
from ..models.entities import (
    AssessmentSession,
    AssessmentStatus,
    Assignment,
    DoctorProfile,
    DoctorReview,
    Explanation,
    JobStatus,
    ModelRun,
    Notification,
    Prediction,
    PatientProfile,
    Report,
    ReportShare,
    ReportStatus,
    User,
)
from ..utils.serializers import prediction_out
from ..services.model_artifact_service import register_model_artifact
from ..services.report_evidence_service import replace_report_evidence


logger = logging.getLogger("neuromind.ai.pipeline")


class AIPipeline:
    def __init__(self, db: Session):
        self.db = db

    def run(self, session_id, run_id=None):
        session = self.db.get(AssessmentSession, session_id)
        if not session:
            raise ValueError("Assessment not found")
        run = self.db.get(ModelRun, run_id) if run_id else None
        if run_id and (run is None or run.session_id != session.id):
            raise ValueError("Analysis run does not belong to this assessment")
        if run is not None and run.status != JobStatus.QUEUED:
            # Workers can redeliver an already completed, expired or in-flight
            # task. Only the queued attempt may create a prediction.
            return {"status":str(run.status),"runId":str(run.id)}
        if run is None:
            adapter = MultimodalModelService()
            adapter_detail = adapter.status_detail()
            run = ModelRun(
                session_id=session.id,
                model_name=adapter.manifest.get("name", "multimodal"),
                model_version=adapter.manifest.get("version", "unconfigured"),
                input_type="multimodal",
                status=JobStatus.PROCESSING,
                started_at=datetime.now(timezone.utc),
                metadata_json=adapter_detail,
            )
            self.db.add(run)
        else:
            adapter = MultimodalModelService()
            adapter_detail = adapter.status_detail()
            run.model_name = adapter.manifest.get("name", "multimodal")
            run.model_version = adapter.manifest.get("version", "unconfigured")
            run.metadata_json = adapter_detail
            run.status = JobStatus.PROCESSING
            run.started_at = datetime.now(timezone.utc)
            run.error_message = None
        session.status = AssessmentStatus.PROCESSING
        self.db.commit()

        try:
            if adapter.status().value != "READY":
                detail = adapter.status_detail()
                message = detail.get("error") or "Multimodal model artifact is not configured."
                self._pending(run, session, message)
                return {"status": "pending_model", "message": run.error_message}

            speech_adapter = SpeechModelService()
            speech_hash = adapter.manifest.get("speech_artifact_sha256")
            if (speech_adapter.status().value != "READY"
                    or speech_adapter.manifest.get("artifact_sha256") != speech_hash
                    or not session.speech
                    or session.speech.speech_artifact_sha256 != speech_hash):
                self._pending(run, session, "Speech features do not match the installed fusion model. Reupload the recording.")
                return {"status": "pending_model", "message": run.error_message}

            model_artifact = register_model_artifact(self.db, adapter)
            run.model_artifact_id = model_artifact.id
            run.metadata_json = {
                **(run.metadata_json or {}),
                "modelArtifactId": str(model_artifact.id),
                "artifactSha256": model_artifact.checksum_sha256,
            }

            features = self._features(session)
            result = adapter.predict([features])
            probability = result.get("probability")
            if probability is None:
                raise RuntimeError("Configured multimodal model did not return a probability.")
            probability = float(probability)
            label = str(result["label"])
            if label not in ("Non-Dementia", "Dementia"):
                raise RuntimeError(f"Unexpected binary screening label: {label}")
            risk = "HIGH" if label == "Dementia" else "LOW"

            pred = Prediction(
                session_id=session.id,
                model_run_id=run.id,
                prediction_label=label,
                risk_level=risk,
                probability=probability,
                confidence_score=result.get("confidence"),
                prediction_json={
                    "features": features,
                    "classProbabilities": result.get("class_probabilities", {}),
                    "modalityScores": self._modality_scores(session),
                    "model": {
                        "name": run.model_name,
                        "version": run.model_version,
                        "artifact": adapter.manifest.get("artifact_sha256"),
                    },
                },
            )
            self.db.add(pred)
            self.db.flush()

            shap_rows = []
            explainability_status = "ready"
            explainability_error = None
            try:
                labels = adapter.manifest.get("class_labels") or []
                target_index = labels.index(label) if label in labels else 0
                shap_rows = SHAPService().explain(
                    adapter.load_model(),
                    adapter.prepare_input([features]),
                    adapter.manifest,
                    target_index,
                ) or []
            except Exception as exc:
                shap_rows = []
                explainability_status = "unavailable"
                explainability_error = str(exc)
            for row in shap_rows:
                self.db.add(
                    Explanation(
                        prediction_id=pred.id,
                        method=row.get("method", "SHAP"),
                        feature_name=row.get("feature_name", "feature"),
                        feature_value=str(row.get("feature_value", "")),
                        importance_value=float(row.get("importance_value", 0)),
                        direction=row.get("direction"),
                        explanation_json=row,
                    )
                )

            evidence = rag.search(self.db, f"dementia risk {label} multimodal cognitive speech", 5)
            pred.prediction_json["shapExplanation"] = shap_rows
            pred.prediction_json["explainabilityStatus"] = explainability_status
            pred.prediction_json["explainabilityError"] = explainability_error
            pred.prediction_json["ragKnowledge"] = evidence
            pred.prediction_json["ragStatus"] = "ready" if evidence else "no_evidence"

            run.status = JobStatus.COMPLETED
            run.completed_at = datetime.now(timezone.utc)
            session.status = AssessmentStatus.PROCESSED
            self.db.commit()

            # Report generation is best-effort. The actual report model is still a
            # separate integration point, so a missing provider leaves the report in
            # PENDING_MODEL instead of fabricating a result.
            report_result = self._generate_and_share_report(session, pred, evidence, shap_rows)
            return {"status": "completed", "prediction": pred, "report": report_result}

        except PendingModelError as exc:
            self._pending(run, session, str(exc))
            return {"status": "pending_model", "message": str(exc)}
        except Exception as exc:
            run.status = JobStatus.FAILED
            run.error_message = str(exc)
            run.completed_at = datetime.now(timezone.utc)
            session.status = AssessmentStatus.FAILED
            self.db.commit()
            raise

    def _pending(self, run, session, message):
        run.status = JobStatus.PENDING_MODEL
        run.error_message = message
        run.completed_at = datetime.now(timezone.utc)
        session.status = AssessmentStatus.FAILED
        self.db.commit()

    @staticmethod
    def _features(session):
        # No synthetic values are created here.  This shared contract is also
        # used by the Phase 1 fusion training pipeline.
        return build_multimodal_features(session)

    @staticmethod
    def _modality_scores(session):
        features = build_multimodal_features(session)
        return {
            "speechFeatureCount": len(session.speech.features) if session.speech else 0,
            "memoryScore": session.memory.memory_score if session.memory else None,
            "immediateRecallScore": session.memory.immediate_recall if session.memory else None,
            "delayedRecallScore": session.memory.delayed_recall if session.memory else None,
            "recognitionScore": session.memory.recognition_score if session.memory else None,
            "attentionScore": session.attention.attention_score if session.attention else None,
            "digitSpanScore": features.get("digit_span"),
            "reactionTimeMs": features.get("reaction_time_ms"),
            "sustainedAttentionScore": features.get("sustained_attention_score"),
            "lifestyleScore": session.lifestyle.overall_lifestyle_score if session.lifestyle else None,
        }

    def _generate_and_share_report(self, session, prediction, evidence, shap_rows):
        self.db.scalar(select(AssessmentSession).where(AssessmentSession.id == session.id).with_for_update())
        report = self.db.scalar(select(Report).where(Report.session_id == session.id))
        if report and report.report_status in (ReportStatus.GENERATED, ReportStatus.REVIEWED, ReportStatus.FINALIZED) and report.ai_report:
            self.db.commit()
            return report
        if report and report.report_status == ReportStatus.GENERATING:
            self.db.commit()
            return report
        if not report:
            report = Report(
                session_id=session.id,
                patient_id=session.patient_id,
                prediction_id=prediction.id,
                report_title="NeuroMind Cognitive Screening Report",
                risk_level=prediction.risk_level,
                report_status=ReportStatus.GENERATING,
            )
            self.db.add(report)
            self.db.flush()
        else:
            report.prediction_id = prediction.id
            report.risk_level = prediction.risk_level
            report.report_status = ReportStatus.GENERATING
        # Release the assessment lock before calling an external provider.
        self.db.commit()

        try:
            screening_result = prediction_out(prediction)
            text = report_generator.generate_report(
                screening_result,
                shap_rows,
                evidence,
            )
            text = append_followup(text, screening_result)
            report.ai_report = text
            report.summary = text[:1000]
            report.evidence_summary = str(evidence)
            report.limitations = "AI-assisted screening output; not a definitive diagnosis."
            report.report_status = ReportStatus.GENERATED
            report.generated_by_model = "Gemini"
            report.model_version = settings.gemini_model

            # Replace rather than append so retries remain idempotent.
            replace_report_evidence(self.db, report.id, evidence)

            self.db.commit()
            try:
                patient = self.db.get(PatientProfile, session.patient_id)
                if patient:
                    patient_user = self.db.get(User, patient.user_id)
                    if patient_user:
                        self.db.add(Notification(
                            recipient_user_id=patient_user.id,
                            type="REPORT_GENERATED",
                            title="Assessment Report Ready",
                            message="Your NeuroMind report is available. Choose an approved doctor to share it with when you are ready.",
                            reference_id=str(report.id),
                        ))
                        self.db.commit()
            except Exception:
                self.db.rollback()
                logger.exception("Report saved but patient notification failed for assessment %s", session.id)
            return report
        except Exception as exc:
            self.db.rollback()
            report = self.db.get(Report, report.id)
            if report:
                report.report_status = ReportStatus.PENDING_MODEL if "not configured" in str(exc).lower() else ReportStatus.FAILED
                report.limitations = "Report generation is unavailable until the configured report provider/model is connected."
                self.db.commit()
            return report
