"""Validate and package the installed Phase 1 model artifacts for deployment.

Run from the project root after training/installing the final compatible
TorchScript speech and fusion artifacts. This bundle excludes datasets,
embeddings, source checkpoints, credentials and frontend files.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEECH = ROOT / "ai_models" / "speech" / "neuromind_speech_bilstm_attention.pt"
FUSION = ROOT / "ai_models" / "multimodal" / "neuromind_multimodal_transformer_binary.pt"
BACKBONE = ROOT / "ai_models" / "speech" / "wav2vec2_backbone"
OUTPUT = ROOT / "dist" / "neuromind-model-bundle.zip"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    required = [
        SPEECH,
        Path(f"{SPEECH}.manifest.json"),
        FUSION,
        Path(f"{FUSION}.manifest.json"),
        BACKBONE / "config.json",
        BACKBONE / "neuromind_backbone.json",
        BACKBONE / "preprocessor_config.json",
        BACKBONE / "tokenizer_config.json",
        BACKBONE / "vocab.json",
    ]
    if not all(path.is_file() and path.stat().st_size > 0 for path in required):
        missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file() or path.stat().st_size == 0]
        print("Missing required trained artifact/backbone files:", file=sys.stderr)
        for path in missing:
            print(" -", path, file=sys.stderr)
        print("Install/export the final compatible Phase 1 artifacts first.", file=sys.stderr)
        return 2
    if not any((BACKBONE / name).is_file() for name in ("model.safetensors", "pytorch_model.bin")):
        print("Wav2Vec2 backbone weights are missing (model.safetensors/pytorch_model.bin).", file=sys.stderr)
        return 2

    validator = subprocess.run(
        [
            sys.executable, "-m", "training.validate_phase1_artifacts",
            "--speech-artifact", str(SPEECH),
            "--fusion-artifact", str(FUSION),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if validator.returncode != 0:
        print("Final model validation failed; no bundle was created.", file=sys.stderr)
        print((validator.stdout + "\n" + validator.stderr)[-6000:], file=sys.stderr)
        return validator.returncode or 1
    print(validator.stdout.strip())

    fusion_manifest = json.loads(Path(f"{FUSION}.manifest.json").read_text(encoding="utf-8"))
    features = fusion_manifest.get("input_features") or []
    background = fusion_manifest.get("background_values")
    if not isinstance(background, list) or len(background) != len(features):
        print("Fusion manifest must include background_values for every input feature.", file=sys.stderr)
        return 2

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.unlink(missing_ok=True)
    files = []
    for base in (SPEECH.parent, FUSION.parent):
        for path in sorted(base.rglob("*")):
            if not path.is_file() or path.is_symlink():
                continue
            if any(part in {"__pycache__", ".cache"} for part in path.parts):
                continue
            # Only include the speech artifact, its manifest, and the Wav2Vec2
            # backbone; omit unrelated files that might have been placed nearby.
            if base == SPEECH.parent and path != SPEECH and path != Path(f"{SPEECH}.manifest.json") and BACKBONE not in path.parents:
                continue
            if base == FUSION.parent and path != FUSION and path != Path(f"{FUSION}.manifest.json"):
                continue
            files.append(path)
    names = set()
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in files:
            arcname = path.relative_to(ROOT / "ai_models").as_posix()
            if arcname in names:
                raise RuntimeError(f"Duplicate bundle path: {arcname}")
            names.add(arcname)
            archive.write(path, arcname)
    digest = sha256_file(OUTPUT)
    print("Model bundle:", OUTPUT.relative_to(ROOT))
    print("Bundle size (MiB):", round(OUTPUT.stat().st_size / (1024 * 1024), 2))
    print("MODEL_BUNDLE_SHA256=" + digest)
    print("Upload this ZIP to stable private HTTPS artifact storage; do not commit it to GitHub.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
