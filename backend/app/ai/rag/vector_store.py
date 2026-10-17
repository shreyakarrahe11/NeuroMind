from ...core.config import settings


class VectorStore:
    def __init__(self, kind="chroma", path="./chroma_db"):
        self.kind = kind
        self.path = path

    def _collection(self):
        if self.kind != "chroma":
            raise NotImplementedError("Only the Chroma vector adapter is implemented")
        try:
            import chromadb
        except ImportError as exc:
            raise RuntimeError("chromadb is required for semantic RAG") from exc
        client = (
            chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port, ssl=settings.chroma_ssl)
            if settings.chroma_host.strip()
            else chromadb.PersistentClient(path=self.path)
        )
        return client.get_or_create_collection(
            "neuromind_knowledge"
        )

    def add(self, ids, documents, embeddings=None, metadata=None):
        if not ids:
            return
        collection = self._collection()
        for start in range(0, len(ids), 64):
            end = start + 64
            kwargs = {"ids": ids[start:end], "documents": documents[start:end]}
            if embeddings is not None:
                kwargs["embeddings"] = embeddings[start:end]
            if metadata is not None:
                kwargs["metadatas"] = metadata[start:end]
            collection.upsert(**kwargs)

    def ids(self):
        return {str(value) for value in self._collection().get(include=[])["ids"]}

    def delete(self, ids):
        if ids:
            self._collection().delete(ids=[str(value) for value in ids])

    def search(self, query, top_k=5):
        return self._collection().query(
            query_texts=[query],
            n_results=max(1, min(int(top_k), 20)),
            include=["documents", "metadatas", "distances"],
        )
