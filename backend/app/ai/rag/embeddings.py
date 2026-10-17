def embed_texts(texts):
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError: raise RuntimeError('sentence-transformers is required for semantic RAG embeddings')
    return SentenceTransformer('all-MiniLM-L6-v2').encode(texts).tolist()
