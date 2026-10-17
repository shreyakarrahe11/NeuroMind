from pathlib import Path


def load_text(path: str):
    source = Path(path)
    if source.suffix.lower() == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("pypdf is required to index PDF knowledge documents") from exc
        return "\n\n".join((page.extract_text() or "") for page in PdfReader(source).pages)
    return source.read_text(encoding="utf-8", errors="ignore")


def load_directory(directory: str):
    root = Path(directory)
    paths = sorted(path for path in root.rglob("*") if path.suffix.lower() in {".txt", ".md", ".pdf"})
    return [(str(path), load_text(str(path))) for path in paths]
