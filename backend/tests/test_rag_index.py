from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.ai.rag.retriever import RAGRetriever
from app.core.config import settings
from app.core.database import Base
from app.models.entities import KnowledgeChunk, KnowledgeDocument


def test_rag_directory_sync_updates_and_removes_sources(tmp_path):
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    source = tmp_path / "approved_guidance.txt"
    source.write_text("Approved cognitive screening evidence alpha.", encoding="utf-8")
    retriever = RAGRetriever()
    previous_kind = settings.vector_db_type
    settings.vector_db_type = "lexical"

    try:
        with Session(engine) as db:
            assert retriever.index_directory(db, str(tmp_path)) == 1
            assert retriever.index_directory(db, str(tmp_path)) == 0
            assert len(retriever.search(db, "cognitive evidence", 5)) == 1

            source.write_text("Updated approved screening evidence beta.", encoding="utf-8")
            assert retriever.index_directory(db, str(tmp_path)) == 1
            assert db.scalar(select(func.count()).select_from(KnowledgeDocument)) == 1
            assert db.scalar(select(func.count()).select_from(KnowledgeChunk)) == 1
            assert retriever.search(db, "beta", 5)[0]["retrievalMethod"] == "lexical"

            source.unlink()
            assert retriever.index_directory(db, str(tmp_path)) == 0
            assert db.scalar(select(func.count()).select_from(KnowledgeDocument)) == 0
            assert db.scalar(select(func.count()).select_from(KnowledgeChunk)) == 0
    finally:
        settings.vector_db_type = previous_kind


def test_semantic_index_recovers_after_partial_failure_and_store_reset(tmp_path, monkeypatch):
    import app.ai.rag.retriever as module

    state = {"ids": set(), "fail_once": True}

    class FakeStore:
        def __init__(self, *args):
            pass

        def ids(self):
            return set(state["ids"])

        def delete(self, ids):
            state["ids"].difference_update(ids)

        def add(self, ids, documents, metadata=None):
            if state["fail_once"]:
                state["fail_once"] = False
                raise RuntimeError("vector store unavailable")
            assert len(ids) == len(documents) == len(metadata)
            state["ids"].update(ids)

    monkeypatch.setattr(module, "VectorStore", FakeStore)
    monkeypatch.setattr(settings, "vector_db_type", "chroma")
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    source = tmp_path / "guidance.txt"
    source.write_text("Evidence for assessment. " * 80, encoding="utf-8")
    retriever = RAGRetriever()
    with Session(engine) as db:
        assert retriever.index_directory(db, str(tmp_path)) == 1
        assert retriever.semantic_status(db)[0] is False
        assert retriever.index_directory(db, str(tmp_path)) == 0
        assert retriever.semantic_status(db)[0] is True
        state["ids"].clear()  # external Chroma volume was reset
        assert retriever.semantic_status(db)[0] is False
        assert retriever.index_directory(db, str(tmp_path)) == 0
        assert retriever.semantic_status(db)[0] is True
        source.unlink()
        retriever.index_directory(db, str(tmp_path))
        assert not state["ids"]
