from datetime import datetime, timedelta, timezone
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.config import settings
from ...core.dependencies import get_current_user, require_doctor
from ...models.entities import *
from ...ai.llm.report_generator import report_generator
from ...ai.llm.followup import append_followup
from ...utils.serializers import report_out, prediction_out
from ...api.v1.ai import authorize
from ...services.pdf_report_service import render_report_pdf
from ...services.report_evidence_service import replace_report_evidence
from ...schemas.common import ReviewIn

router = APIRouter(prefix="/reports", tags=["Reports"])
logger = logging.getLogger("neuromind.reports")


@router.post("/generate/{assessment_id}")
def generate(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        aid = UUID(assessment_id)
    except ValueError:
        raise HTTPException(400, "Invalid assessment id")
    assessment = db.get(AssessmentSession, aid)
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    authorize(assessment, user, db)
    prediction = db.scalar(select(Prediction).where(Prediction.session_id == assessment.id).order_by(Prediction.created_at.desc()))
    if not prediction:
        raise HTTPException(409, "Prediction is not available; the configured AI model may still be pending.")

    db.scalar(select(AssessmentSession).where(AssessmentSession.id == assessment.id).with_for_update())
    report = db.scalar(select(Report).where(Report.session_id == assessment.id))
    if report and report.report_status in [ReportStatus.GENERATED, ReportStatus.REVIEWED, ReportStatus.FINALIZED] and report.ai_report:
        db.commit()
        return {"reportText": report.ai_report, "report": report_out(report, db)}
    if report and report.report_status == ReportStatus.GENERATING:
        updated = report.updated_at
        if updated and (updated if updated.tzinfo else updated.replace(tzinfo=timezone.utc)) > datetime.now(timezone.utc) - timedelta(minutes=5):
            db.commit()
            raise HTTPException(409, "Report generation is already in progress")

    if not report:
        report = Report(
            session_id=assessment.id,
            patient_id=assessment.patient_id,
            prediction_id=prediction.id,
            report_title="NeuroMind Cognitive Screening Report",
            risk_level=prediction.risk_level,
            report_status=ReportStatus.GENERATING,
        )
        db.add(report)
    else:
        report.prediction_id = prediction.id
        report.risk_level = prediction.risk_level
        report.report_status = ReportStatus.GENERATING
    db.commit()

    try:
        screening_result = prediction_out(prediction)
        text = report_generator.generate_report(
            screening_result,
            prediction.prediction_json.get("shapExplanation", []),
            prediction.prediction_json.get("ragKnowledge", []),
        )
        text = append_followup(text, screening_result)
        report.ai_report = text
        report.summary = text[:1000]
        report.evidence_summary = str(prediction.prediction_json.get("ragKnowledge", []))
        report.limitations = "AI-assisted screening output; not a definitive diagnosis."
        report.report_status = ReportStatus.GENERATED
        report.generated_by_model = "Gemini"
        report.model_version = settings.gemini_model
        replace_report_evidence(db, report.id, prediction.prediction_json.get("ragKnowledge", []))
        db.commit()
        try:
            patient = db.get(PatientProfile, report.patient_id)
            if patient:
                db.add(Notification(recipient_user_id=patient.user_id, type="REPORT_GENERATED", title="Assessment Report Ready", message="Your NeuroMind report is available. Choose a doctor to share it with when you are ready.", reference_id=str(report.id)))
                db.commit()
        except Exception:
            db.rollback()
            logger.exception("Report saved but notification failed for assessment %s", assessment.id)
        return {"reportText": report.ai_report, "report": report_out(report, db)}
    except Exception as exc:
        logger.exception("Report generation failed for assessment %s", assessment.id)
        db.rollback()
        stored = db.get(Report, report.id)
        if stored:
            stored.report_status = ReportStatus.PENDING_MODEL if "not configured" in str(exc).lower() else ReportStatus.FAILED
            stored.updated_at = datetime.now(timezone.utc)
            stored.limitations = "Report generation is unavailable until the configured provider/model is connected."
            db.commit()
        raise HTTPException(503, "Report generation is unavailable. Try again later or contact support.") from exc


@router.get("/{report_id}")
def get_report(report_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        rid = UUID(report_id)
    except ValueError:
        raise HTTPException(400, "Invalid report id")
    report = db.get(Report, rid)
    if not report:
        raise HTTPException(404, "Report not found")
    authorize(db.get(AssessmentSession, report.session_id), user, db)
    return report_out(report, db)


@router.get("/{report_id}/evidence")
def evidence(report_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        rid = UUID(report_id)
    except ValueError:
        raise HTTPException(400, "Invalid report id")
    report = db.get(Report, rid)
    if not report:
        raise HTTPException(404, "Report not found")
    authorize(db.get(AssessmentSession, report.session_id), user, db)
    return [{"id": str(e.id), "relevanceScore": e.relevance_score, "quotedContext": e.quoted_context} for e in report.evidence]


@router.get("/{report_id}/download")
def download(report_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        rid = UUID(report_id)
    except ValueError:
        raise HTTPException(400, "Invalid report id")
    report = db.get(Report, rid)
    if not report:
        raise HTTPException(404, "Report not found")
    authorize(db.get(AssessmentSession, report.session_id), user, db)
    if not report.ai_report:
        raise HTTPException(409, "Report is not generated yet")
    filename = f"NeuroMind_Report_{str(report.id)[:8]}.pdf"
    return Response(
        content=render_report_pdf(report, db),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{report_id}/review")
def review(report_id: str, data: ReviewIn, user=Depends(require_doctor), db: Session = Depends(get_db)):
    try:
        rid = UUID(report_id)
    except ValueError:
        raise HTTPException(400, "Invalid report id")
    report = db.get(Report, rid)
    if not report:
        raise HTTPException(404, "Report not found")
    authorize(db.get(AssessmentSession, report.session_id), user, db)
    doctor = user.doctor_profile
    if not doctor:
        raise HTTPException(403, "Doctor profile not found")
    review_row = db.scalar(select(DoctorReview).where(DoctorReview.report_id == report.id, DoctorReview.doctor_id == doctor.id).order_by(DoctorReview.created_at.desc()))
    if not review_row:
        review_row = DoctorReview(report_id=report.id, doctor_id=doctor.id)
        db.add(review_row)
    review_row.doctor_summary = data.doctor_summary.strip()
    review_row.recommendation = data.recommendation.strip()
    review_row.follow_up_required = data.follow_up_required
    review_row.follow_up_date = data.follow_up_date
    review_row.review_status = "REVIEWED"
    report.report_status = ReportStatus.REVIEWED
    db.commit()
    patient = db.get(PatientProfile, report.patient_id)
    if patient:
        db.add(Notification(recipient_user_id=patient.user_id, type="REPORT_REVIEWED", title="Doctor Review Completed", message="Your assigned doctor reviewed your NeuroMind report.", reference_id=str(report.id)))
    db.commit()
    return report_out(report, db)


@router.put("/{report_id}/review")
def update_review(report_id: str, data: ReviewIn, user=Depends(require_doctor), db: Session = Depends(get_db)):
    return review(report_id, data, user, db)


@router.get("/{report_id}/review")
def get_review(report_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        rid = UUID(report_id)
    except ValueError:
        raise HTTPException(400, "Invalid report id")
    report = db.get(Report, rid)
    if not report:
        raise HTTPException(404, "Report not found")
    authorize(db.get(AssessmentSession, report.session_id), user, db)
    review_row = db.scalar(select(DoctorReview).where(DoctorReview.report_id == report.id).order_by(DoctorReview.created_at.desc()))
    return {
        "reviewed": bool(review_row),
        "doctorSummary": review_row.doctor_summary if review_row else None,
        "recommendation": review_row.recommendation if review_row else None,
        "followUpRequired": review_row.follow_up_required if review_row else False,
    }
