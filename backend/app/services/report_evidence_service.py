from uuid import UUID

from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..models.entities import KnowledgeChunk, ReportEvidence


def replace_report_evidence(db: Session, report_id, evidence: list[dict] | None) -> int:
    """Replace a report's evidence links with verified local knowledge chunks.

    Only chunks that still exist in PostgreSQL are persisted. The document id
    is read from the chunk itself, so untrusted/generated metadata cannot link
    a report to an unrelated source document.
    """
    db.execute(delete(ReportEvidence).where(ReportEvidence.report_id == report_id))
    stored = 0
    for item in evidence or []:
        try:
            chunk_id = UUID(str(item.get("chunkId") or item.get("id")))
        except (TypeError, ValueError):
            continue
        chunk = db.get(KnowledgeChunk, chunk_id)
        if not chunk:
            continue
        db.add(
            ReportEvidence(
                report_id=report_id,
                document_id=chunk.document_id,
                chunk_id=chunk.id,
                relevance_score=float(item.get("relevanceScore", 0.0)),
                quoted_context=str(item.get("snippet") or chunk.chunk_text[:700])[:2000],
            )
        )
        stored += 1
    return stored
