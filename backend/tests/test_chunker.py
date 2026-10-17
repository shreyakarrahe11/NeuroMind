from app.ai.rag.chunker import chunk_text


def test_chunker_preserves_short_source_and_bounded_long_chunks():
    assert chunk_text("  Doctor advice.  ") == ["Doctor advice."]
    assert chunk_text("  ") == []
    text = ("First clinical sentence. Second clinical sentence.\n\n" * 90).strip()
    pieces = chunk_text(text, size=350, overlap=50)
    assert len(pieces) > 5
    assert all(piece and len(piece) <= 350 for piece in pieces)
    assert pieces[-1].endswith("Second clinical sentence.")
