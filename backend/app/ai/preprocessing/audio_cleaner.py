from pathlib import Path
def validate_audio(path: str):
    p=Path(path)
    if not p.exists(): raise FileNotFoundError(path)
    return p
