"""Download and atomically install a checksum-verified NeuroMind model bundle.

The bundle must be a ZIP whose root contains ``speech/`` and ``multimodal/``.
Model weights are never fetched by the browser and are never downloaded without
an expected SHA-256 supplied through the deployment environment.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import stat
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse

TABULAR_FEATURES = [
    "memory_score", "immediate_recall", "delayed_recall", "recognition_score",
    "attention_score", "digit_span", "reaction_time_ms", "sustained_attention_score",
    "sleep_hours", "sleep_quality", "exercise_hours_week", "smoking", "alcohol_use",
    "medical_history", "lifestyle_score",
]
CLASS_LABELS = ["Non-Dementia", "Dementia"]
SPEECH_NAME = "neuromind_speech_bilstm_attention.pt"
FUSION_NAME = "neuromind_multimodal_transformer_binary.pt"
DEFAULT_MAX_DOWNLOAD_BYTES = 8 * 1024**3
MAX_UNPACKED_BYTES = 20 * 1024**3
MAX_ARCHIVE_ENTRIES = 25000


class BundleError(RuntimeError):
    """Raised when a model bundle is incomplete or incompatible."""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise BundleError(f"Invalid JSON metadata: {path.name}") from exc
    if not isinstance(value, dict):
        raise BundleError(f"Metadata must be a JSON object: {path.name}")
    return value


def _require_file(path: Path, label: str) -> None:
    if not path.is_file() or path.stat().st_size <= 0:
        raise BundleError(f"Required model bundle file is missing or empty: {label}")


def _verify_artifact(artifact: Path, manifest_path: Path, task: str) -> dict:
    _require_file(artifact, artifact.name)
    _require_file(manifest_path, manifest_path.name)
    manifest = read_json(manifest_path)
    if manifest.get("task") != task:
        raise BundleError(f"{artifact.name} manifest task must be {task}.")
    expected = str(manifest.get("artifact_sha256") or "").lower().strip()
    if len(expected) != 64 or any(c not in "0123456789abcdef" for c in expected):
        raise BundleError(f"{manifest_path.name} must contain artifact_sha256.")
    if sha256_file(artifact) != expected:
        raise BundleError(f"Artifact checksum does not match: {artifact.name}")
    if manifest.get("class_labels") != CLASS_LABELS:
        raise BundleError(f"{artifact.name} must use the two canonical class labels.")
    return manifest


def validate_bundle_root(root: Path) -> dict:
    """Validate all files and cross-artifact contracts without running inference."""
    root = Path(root)
    speech_dir = root / "speech"
    fusion_dir = root / "multimodal"
    speech_path = speech_dir / SPEECH_NAME
    fusion_path = fusion_dir / FUSION_NAME
    speech_manifest = _verify_artifact(
        speech_path,
        speech_dir / f"{SPEECH_NAME}.manifest.json",
        "speech_sequence_encoder",
    )
    fusion_manifest = _verify_artifact(
        fusion_path,
        fusion_dir / f"{FUSION_NAME}.manifest.json",
        "binary_multimodal_screening",
    )

    try:
        input_dim = int(speech_manifest.get("input_dim", 0))
        embedding_dim = int(speech_manifest.get("embedding_dim", 0))
    except (TypeError, ValueError) as exc:
        raise BundleError("Speech manifest dimensions must be integers.") from exc
    if speech_manifest.get("sequence_input") is not True or input_dim != 768 or embedding_dim <= 0:
        raise BundleError("Speech manifest must declare sequence_input=true, input_dim=768 and a positive embedding_dim.")
    wav2vec_model = str(speech_manifest.get("wav2vec_model") or "").strip()
    if not wav2vec_model:
        raise BundleError("Speech manifest must declare wav2vec_model.")

    backbone_dir = speech_dir / "wav2vec2_backbone"
    for filename in (
        "config.json", "neuromind_backbone.json", "preprocessor_config.json",
        "tokenizer_config.json", "vocab.json",
    ):
        _require_file(backbone_dir / filename, f"wav2vec2_backbone/{filename}")
    if not any((backbone_dir / filename).is_file() for filename in ("model.safetensors", "pytorch_model.bin")):
        raise BundleError("Wav2Vec2 backbone needs model.safetensors or pytorch_model.bin.")
    backbone_metadata = read_json(backbone_dir / "neuromind_backbone.json")
    backbone_config = read_json(backbone_dir / "config.json")
    try:
        hidden_size = int(backbone_config.get("hidden_size", -1))
    except (TypeError, ValueError):
        hidden_size = -1
    if backbone_metadata.get("source_model") != wav2vec_model:
        raise BundleError("Wav2Vec2 backbone source does not match the speech manifest.")
    if hidden_size != input_dim:
        raise BundleError("Wav2Vec2 hidden_size does not match the speech input_dim.")

    try:
        fusion_speech_dim = int(fusion_manifest.get("speech_embedding_dim", 0))
    except (TypeError, ValueError) as exc:
        raise BundleError("Fusion speech_embedding_dim must be an integer.") from exc
    expected_features = [f"speech_embedding_{i}" for i in range(embedding_dim)] + TABULAR_FEATURES
    if fusion_speech_dim != embedding_dim:
        raise BundleError("Speech and fusion embedding dimensions do not match.")
    if fusion_manifest.get("input_features") != expected_features:
        raise BundleError("Fusion input_features must match the ordered speech embedding and exact 15 website features.")
    if fusion_manifest.get("speech_artifact_sha256") != speech_manifest.get("artifact_sha256"):
        raise BundleError("Fusion model was not trained with this exact speech artifact.")
    background = fusion_manifest.get("background_values")
    if not isinstance(background, list) or len(background) != len(expected_features):
        raise BundleError("Fusion manifest must include background_values for every input feature.")

    return {
        "speech_sha256": speech_manifest["artifact_sha256"],
        "fusion_sha256": fusion_manifest["artifact_sha256"],
        "speech_embedding_dim": embedding_dim,
        "fusion_feature_count": len(expected_features),
    }


class HTTPSOnlyRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Allow HTTPS redirects only and never forward bearer auth to another host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urlparse(newurl)
        if parsed.scheme.lower() != "https":
            raise urllib.error.HTTPError(newurl, code, "Refusing non-HTTPS redirect", headers, fp)
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected is not None and urlparse(req.full_url).hostname != parsed.hostname:
            redirected.remove_header("Authorization")
        return redirected


def download_bundle(url: str, expected_sha256: str, target_file: Path, token: str = "") -> None:
    parsed = urlparse(url)
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        raise BundleError("MODEL_BUNDLE_URL must be a direct HTTPS download URL.")
    if parsed.username or parsed.password:
        raise BundleError("Do not embed credentials in MODEL_BUNDLE_URL; use MODEL_BUNDLE_BEARER_TOKEN.")
    expected = expected_sha256.lower().strip()
    if len(expected) != 64 or any(c not in "0123456789abcdef" for c in expected):
        raise BundleError("MODEL_BUNDLE_SHA256 must be the 64-character SHA-256 of the bundle ZIP.")
    try:
        max_bytes = int(os.environ.get("MODEL_BUNDLE_MAX_BYTES", DEFAULT_MAX_DOWNLOAD_BYTES))
    except ValueError as exc:
        raise BundleError("MODEL_BUNDLE_MAX_BYTES must be an integer.") from exc
    if max_bytes <= 0:
        raise BundleError("MODEL_BUNDLE_MAX_BYTES must be positive.")

    headers = {"User-Agent": "NeuroMind-model-bundle-installer/1.0", "Accept": "application/zip, application/octet-stream"}
    if token.strip():
        headers["Authorization"] = f"Bearer {token.strip()}"
    request = urllib.request.Request(url, headers=headers)
    opener = urllib.request.build_opener(HTTPSOnlyRedirectHandler())
    digest = hashlib.sha256()
    size = 0
    try:
        with opener.open(request, timeout=90) as response, target_file.open("xb") as output:
            if urlparse(response.geturl()).scheme.lower() != "https":
                raise BundleError("Final model bundle URL is not HTTPS.")
            length = response.headers.get("Content-Length")
            if length and int(length) > max_bytes:
                raise BundleError("Model bundle exceeds MODEL_BUNDLE_MAX_BYTES.")
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise BundleError("Model bundle exceeded MODEL_BUNDLE_MAX_BYTES while downloading.")
                digest.update(chunk)
                output.write(chunk)
    except Exception:
        target_file.unlink(missing_ok=True)
        raise
    if digest.hexdigest() != expected:
        target_file.unlink(missing_ok=True)
        raise BundleError("Downloaded model bundle SHA-256 does not match MODEL_BUNDLE_SHA256.")


def safe_extract_bundle(archive_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path) as archive:
        infos = archive.infolist()
        if not infos or len(infos) > MAX_ARCHIVE_ENTRIES:
            raise BundleError("Model ZIP is empty or contains too many entries.")
        seen: set[str] = set()
        expanded_size = 0
        for info in infos:
            name = info.filename
            if not name or "\\" in name:
                raise BundleError("Model ZIP contains an invalid path.")
            path = PurePosixPath(name)
            if not path.parts or path.is_absolute() or any(part in {"..", "."} for part in path.parts) or ":" in path.parts[0]:
                raise BundleError("Model ZIP contains a path traversal entry.")
            normalized = path.as_posix().rstrip("/")
            if normalized in seen:
                raise BundleError("Model ZIP contains duplicate paths.")
            seen.add(normalized)
            if not path.parts or path.parts[0] not in {"speech", "multimodal", "README.md"}:
                raise BundleError("Model ZIP must contain only speech/, multimodal/ and optional README.md at its root.")
            if path.parts[0] == "README.md" and len(path.parts) != 1:
                raise BundleError("Invalid README path in model ZIP.")
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                raise BundleError("Symbolic links are not allowed in the model ZIP.")
            expanded_size += info.file_size
            if expanded_size > MAX_UNPACKED_BYTES:
                raise BundleError("Model ZIP expands beyond the configured safety limit.")
            target = destination.joinpath(*path.parts)
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info, "r") as source, target.open("xb") as output:
                shutil.copyfileobj(source, output, length=1024 * 1024)


def install_bundle(bundle_url: str, bundle_sha256: str, target: Path, token: str = "") -> dict:
    target = Path(target).resolve()
    target.mkdir(parents=True, exist_ok=True)
    marker = target / ".bundle.sha256"
    expected = bundle_sha256.strip().lower()
    if len(expected) != 64 or any(c not in "0123456789abcdef" for c in expected):
        raise BundleError("MODEL_BUNDLE_SHA256 must be the 64-character SHA-256 of the bundle ZIP.")
    if marker.is_file() and marker.read_text(encoding="ascii").strip() == expected:
        try:
            details = validate_bundle_root(target)
            return {**details, "status": "already_installed"}
        except BundleError:
            # A matching marker with modified files is an integrity failure;
            # do not silently overwrite or trust the damaged installation.
            raise BundleError("Installed bundle marker matches, but installed artifacts failed validation. Remove the model volume only after review.")

    with tempfile.TemporaryDirectory(prefix="neuromind-model-download-") as temporary:
        temp_dir = Path(temporary)
        archive_path = temp_dir / "model-bundle.zip"
        download_bundle(bundle_url, expected, archive_path, token)
        stage = target / f".staging-{os.getpid()}"
        if stage.exists():
            shutil.rmtree(stage)
        stage.mkdir()
        backups: dict[str, Path] = {}
        installed: list[str] = []
        try:
            safe_extract_bundle(archive_path, stage)
            details = validate_bundle_root(stage)
            for name in ("speech", "multimodal"):
                current = target / name
                if current.exists():
                    backup = target / f".backup-{name}-{os.getpid()}"
                    if backup.exists():
                        shutil.rmtree(backup)
                    os.replace(current, backup)
                    backups[name] = backup
                os.replace(stage / name, current)
                installed.append(name)
            marker_tmp = target / f".bundle.sha256.tmp-{os.getpid()}"
            marker_tmp.write_text(expected + "\n", encoding="ascii")
            os.replace(marker_tmp, marker)
            for backup in backups.values():
                shutil.rmtree(backup, ignore_errors=True)
            return {**details, "status": "installed"}
        except Exception:
            for name in reversed(installed):
                shutil.rmtree(target / name, ignore_errors=True)
            for name, backup in backups.items():
                if backup.exists():
                    os.replace(backup, target / name)
            raise
        finally:
            shutil.rmtree(stage, ignore_errors=True)


def main() -> int:
    url = os.environ.get("MODEL_BUNDLE_URL", "").strip()
    digest = os.environ.get("MODEL_BUNDLE_SHA256", "").strip()
    token = os.environ.get("MODEL_BUNDLE_BEARER_TOKEN", "")
    target = Path(os.environ.get("MODEL_BUNDLE_TARGET_DIR", "/app/ai_models"))
    if not url or not digest:
        print("[FAIL] Set MODEL_BUNDLE_URL and MODEL_BUNDLE_SHA256 in the deployment environment.", file=sys.stderr)
        return 2
    try:
        result = install_bundle(url, digest, target, token)
    except Exception as exc:
        # Do not print the URL or authorization token; URLs can contain signed credentials.
        print(f"[FAIL] Model bundle installation failed: {exc.__class__.__name__}: {exc}", file=sys.stderr)
        return 1
    print(
        "[PASS] Model bundle " + result["status"]
        + f"; speech embedding dim={result['speech_embedding_dim']}"
        + f"; fusion feature count={result['fusion_feature_count']}"
        + "; checksums and cross-model contract verified."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
