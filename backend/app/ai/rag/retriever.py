from pathlib import Path
from hashlib import sha256
import re
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...models.entities import KnowledgeChunk, KnowledgeDocument
from .chunker import CHUNKER_VERSION, chunk_text
from .document_loader import load_directory
from .vector_store import VectorStore
from ...core.config import settings


_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokens(value: str):
    return set(_TOKEN_RE.findall((value or "").lower()))


class RAGRetriever:
    """Small persistent RAG index with a lexical fallback.

    The database is the source of truth for documents/chunks. A vector store can
    be added later without changing the report API contract.
    """

    def __init__(self):
        self.last_vector_error = None

    def index_directory(self, db: Session, directory: str) -> int:
        root = Path(directory)
        if not root.exists():
            return 0
        loaded = load_directory(str(root))
        discovered = {str(Path(raw_path).resolve()) for raw_path, _ in loaded}
        indexed = 0

        # Treat this directory as authoritative: a removed source must not
        # remain retrievable from PostgreSQL or the semantic index.
        for document in db.scalars(select(KnowledgeDocument)).all():
            try:
                belongs_to_root = Path(document.file_path).resolve().is_relative_to(root.resolve())
            except (OSError, ValueError):
                belongs_to_root = False
            if belongs_to_root and str(Path(document.file_path).resolve()) not in discovered:
                db.delete(document)

        for raw_path, raw_text in loaded:
            path = Path(raw_path)
            text = raw_text.strip()
            if not text:
                continue
            content_sha256 = sha256(text.encode("utf-8")).hexdigest()
            source = path.parent.name or "NeuroMind Knowledge Base"
            title = path.stem.replace("_", " ").replace("-", " ").strip().title()
            existing = db.scalar(select(KnowledgeDocument).where(KnowledgeDocument.file_path == str(path)))
            if existing:
                document = existing
                if ((document.metadata_json or {}).get("content_sha256") == content_sha256
                        and (document.metadata_json or {}).get("chunker_version") == CHUNKER_VERSION
                        and document.chunks):
                    continue
                for chunk in list(document.chunks):
                    db.delete(chunk)
                db.flush()
                document.title = title
                document.source = source
                document.document_type = path.suffix.lower().lstrip(".")
                document.metadata_json = {"content_sha256": content_sha256, "chunker_version": CHUNKER_VERSION}
            else:
                document = KnowledgeDocument(
                    title=title,
                    source=source,
                    document_type=path.suffix.lower().lstrip("."),
                    file_path=str(path),
                    metadata_json={"content_sha256": content_sha256, "chunker_version": CHUNKER_VERSION},
                )
                db.add(document)
                db.flush()
            indexed += 1

            for index, text_chunk in enumerate(chunk_text(text)):
                chunk = KnowledgeChunk(
                        document_id=document.id,
                        chunk_text=text_chunk,
                        chunk_index=index,
                        vector_id=None,
                        metadata_json={"path": str(path), "source": source, "title": title},
                    )
                db.add(chunk)
                db.flush()
        db.commit()
        self.last_vector_error = None
        if settings.vector_db_type.lower() == "chroma":
            try:
                store = VectorStore("chroma", settings.chroma_path)
                # Reconcile from PostgreSQL every time. This repairs partial
                # vector writes, a restarted Chroma store, and deleted PDFs.
                current = store.ids()
                chunks = db.scalars(select(KnowledgeChunk)).all()
                wanted = {str(chunk.id) for chunk in chunks}
                store.delete(sorted(current - wanted))
                missing = [chunk for chunk in chunks if str(chunk.id) not in current or chunk.vector_id != str(chunk.id)]
                store.add(
                    [str(chunk.id) for chunk in missing],
                    [chunk.chunk_text for chunk in missing],
                    metadata=[{
                        "document_id": str(chunk.document_id),
                        "source": chunk.document.source,
                        "title": chunk.document.title,
                    } for chunk in missing],
                )
                for chunk in missing:
                    chunk.vector_id = str(chunk.id)
                db.commit()
            except Exception as exc:
                self.last_vector_error = str(exc)
        return indexed

    def semantic_status(self, db: Session):
        if settings.vector_db_type.lower() != "chroma":
            return False, "Semantic retrieval is disabled; lexical search is available."
        chunks = db.scalars(select(KnowledgeChunk)).all()
        wanted = {str(chunk.id) for chunk in chunks}
        if not wanted:
            return False, "No knowledge chunks are indexed."
        if any(chunk.vector_id != str(chunk.id) for chunk in chunks):
            return False, "Knowledge vectors are incomplete; run the Admin RAG index again."
        try:
            actual = VectorStore("chroma", settings.chroma_path).ids()
        except Exception as exc:
            return False, f"Semantic store is unavailable: {exc}"
        if actual != wanted:
            return False, "Semantic index differs from the knowledge database; run indexing again."
        return True, None

    def search(self, db: Session, query: str, top_k: int = 5):
        if settings.vector_db_type.lower() == "chroma":
            try:
                raw = VectorStore("chroma", settings.chroma_path).search(query, top_k)
                ids = (raw.get("ids") or [[]])[0]
                distances = (raw.get("distances") or [[]])[0]
                semantic = []
                for index, value in enumerate(ids):
                    try:
                        chunk = db.get(KnowledgeChunk, UUID(str(value)))
                    except Exception:
                        chunk = None
                    if not chunk:
                        continue
                    distance = float(distances[index]) if index < len(distances) else 1.0
                    semantic.append(self._result(chunk, max(0.0, 1.0 / (1.0 + distance)), "semantic"))
                if semantic:
                    self.last_vector_error = None
                    return semantic
            except Exception as exc:
                self.last_vector_error = str(exc)

        query_tokens = _tokens(query)
        rows = db.scalars(select(KnowledgeChunk)).all()
        scored = []
        for chunk in rows:
            text_tokens = _tokens(chunk.chunk_text)
            title = ""
            if chunk.document:
                title = chunk.document.title
            score = len(query_tokens.intersection(text_tokens | _tokens(title)))
            if score:
                scored.append((score, chunk))
        scored.sort(key=lambda item: (item[0], -item[1].chunk_index), reverse=True)
        result = []
        for score, chunk in scored[: max(1, min(top_k, 20))]:
            result.append(self._result(chunk, float(score), "lexical"))
        return result

    @staticmethod
    def _result(chunk, score, method):
        return {
            "id": str(chunk.id),
            "title": chunk.document.title if chunk.document else "NeuroMind Knowledge",
            "source": chunk.document.source if chunk.document else "NeuroMind Knowledge Base",
            "snippet": chunk.chunk_text[:700],
            "relevanceScore": float(score),
            "retrievalMethod": method,
            "chunkId": str(chunk.id),
            "documentId": str(chunk.document_id),
        }


rag = RAGRetriever()
