from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...core.dependencies import get_current_user, require_admin
from ...ai.rag.retriever import rag
from ...schemas.common import RagSearchIn
from ...services.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/index")
def index_knowledge_base(db: Session = Depends(get_db), admin=Depends(require_admin)):
    count = rag.index_directory(db, str(settings.knowledge_dir))
    semantic_ready, semantic_error = rag.semantic_status(db)
    return {
        "success": True,
        "documentsIndexed": count,
        "semanticIndexReady": semantic_ready,
        "semanticIndexError": rag.last_vector_error or semantic_error,
    }


@router.post("/search")
def search(data: RagSearchIn, request: Request, user=Depends(get_current_user), db: Session = Depends(get_db)):
    enforce_rate_limit(request, "rag-search", actor=user.id, limit=30, window_seconds=60)
    return rag.search(db, data.query.strip(), data.top_k)
