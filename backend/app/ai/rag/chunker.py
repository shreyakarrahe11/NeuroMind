"""Split retrieved PDF text without cutting most sentences in half."""


CHUNKER_VERSION = 2


def chunk_text(text: str, size: int = 1000, overlap: int = 100) -> list[str]:
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError("size must be positive and overlap must be smaller than size")
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            # Prefer a paragraph or sentence boundary close to the target size.
            window_start = start + max(size // 2, overlap + 1)
            candidates = [
                text.rfind("\n\n", window_start, end),
                text.rfind(". ", window_start, end),
                text.rfind(" ", window_start, end),
            ]
            boundary = next((index for index in candidates if index > start), -1)
            if boundary > start:
                end = boundary + (2 if text[boundary:boundary + 2] in ("\n\n", ". ") else 1)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks
