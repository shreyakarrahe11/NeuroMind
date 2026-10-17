from io import BytesIO
from html import escape

from sqlalchemy.orm import Session

from ..models.entities import PatientProfile, Prediction, User


def render_report_pdf(report, db: Session) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as exc:
        raise RuntimeError("reportlab is required for PDF report downloads") from exc

    patient = db.get(PatientProfile, report.patient_id)
    patient_user = db.get(User, patient.user_id) if patient else None
    prediction = db.get(Prediction, report.prediction_id) if report.prediction_id else None
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "NeuroMindTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#4A2333"),
    )
    body = styles["BodyText"]
    body.leading = 15
    story = [
        Paragraph("NeuroMind Cognitive Screening Report", title_style),
        Spacer(1, 6 * mm),
    ]
    details = [
        ["Report ID", str(report.id)],
        ["Assessment ID", str(report.session_id)],
        ["Patient", f"{patient_user.first_name} {patient_user.last_name}".strip() if patient_user else "Unavailable"],
        ["Generated", report.updated_at.isoformat()],
        ["Screening label", prediction.prediction_label if prediction else "Unavailable"],
        ["Risk level", str(report.risk_level or "Unavailable")],
        ["Model", f"{report.generated_by_model} {report.model_version}"],
    ]
    table = Table(details, colWidths=[42 * mm, 118 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8E3DA")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#4A2333")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D9CCD1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([table, Spacer(1, 6 * mm)])
    for line in (report.ai_report or "").splitlines():
        clean = line.strip()
        if not clean:
            story.append(Spacer(1, 2 * mm))
        elif clean.startswith("#"):
            story.append(Paragraph(escape(clean.lstrip("# ")), styles["Heading2"]))
        else:
            escaped = clean.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(escaped, body))
    story.extend([
        Spacer(1, 6 * mm),
        Paragraph("Important limitation", styles["Heading2"]),
        Paragraph(escape(report.limitations
            or "This AI-assisted screening output is not a diagnosis and requires qualified clinical interpretation."),
            body),
    ])
    if report.evidence:
        story.extend([Spacer(1, 4 * mm), Paragraph("Knowledge evidence", styles["Heading2"])])
        for index, item in enumerate(report.evidence, start=1):
            escaped = (item.quoted_context or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(f"[KB{index}] {escaped}", body))
    doc.build(story)
    return buffer.getvalue()
