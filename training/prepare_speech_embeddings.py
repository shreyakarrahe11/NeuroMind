"""Extract frame-level Wav2Vec2 representations from the speech dataset.

Expected default layout::

    Speech Dataset/
      Dementia/<patient>/<recording>.wav
      Non_Dementia/<patient>/<recording>.wav

The output manifest is the only input consumed by ``train_speech.py``.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd

from training.common import canonical_label, load_label_map, seed_everything, write_json, sha256


AUDIO_SUFFIXES = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm"}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--label-map", help="JSON map for folder label -> class label")
    parser.add_argument("--model-name", default="facebook/wav2vec2-base-960h")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--resume", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    seed_everything(args.seed)
    import librosa
    import torch
    from transformers import AutoModel, AutoProcessor

    root = Path(args.audio_root).expanduser().resolve()
    output = Path(args.output_dir).expanduser().resolve()
    cache = output / "wav2vec_sequences"
    cache.mkdir(parents=True, exist_ok=True)
    label_map = load_label_map(args.label_map)
    audio_paths = sorted(path for path in root.rglob("*") if path.suffix.lower() in AUDIO_SUFFIXES)
    if not audio_paths:
        raise FileNotFoundError(f"No supported audio files found below {root}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = AutoProcessor.from_pretrained(args.model_name)
    model = AutoModel.from_pretrained(args.model_name).to(device).eval()
    backbone = output / "wav2vec2_backbone"
    backbone.mkdir(parents=True, exist_ok=True)
    processor.save_pretrained(backbone)
    model.save_pretrained(backbone, safe_serialization=True)
    write_json(backbone / "neuromind_backbone.json", {
        "source_model": args.model_name,
        "hidden_size": int(model.config.hidden_size),
    })
    rows = []
    failures = []

    for index, audio_path in enumerate(audio_paths, start=1):
        relative = audio_path.relative_to(root)
        if len(relative.parts) < 3:
            failures.append({"path": str(audio_path), "error": "Expected label/patient/file layout"})
            continue
        raw_label, patient_id = relative.parts[0], relative.parts[1]
        label = canonical_label(raw_label, label_map)
        digest = hashlib.sha1(str(relative).encode("utf-8")).hexdigest()
        embedding_path = cache / f"{digest}.npz"
        try:
            source_sha256 = sha256(audio_path)
            if not (args.resume and embedding_path.exists()):
                audio, sample_rate = librosa.load(audio_path, sr=16000, mono=True)
                if audio.size == 0:
                    raise ValueError("Decoded audio is empty")
                inputs = processor(
                    audio,
                    sampling_rate=sample_rate,
                    return_tensors="pt",
                    return_attention_mask=True,
                )
                inputs = {key: value.to(device) for key, value in inputs.items()}
                with torch.inference_mode():
                    hidden = model(**inputs).last_hidden_state.squeeze(0).cpu().numpy()
                np.savez_compressed(embedding_path, hidden_states=hidden.astype(np.float16))
            with np.load(embedding_path) as item:
                shape = item["hidden_states"].shape
            rows.append(
                {
                    "patient_id": patient_id,
                    "label": label,
                    "audio_path": str(audio_path),
                    "embedding_path": str(embedding_path),
                    "frames": int(shape[0]),
                    "embedding_dim": int(shape[1]),
                    "audio_sha256": source_sha256,
                }
            )
            if index % 25 == 0:
                print(f"Processed {index}/{len(audio_paths)} recordings")
        except Exception as exc:
            failures.append({"path": str(audio_path), "error": str(exc)})

    manifest = pd.DataFrame(rows)
    if manifest.empty:
        raise RuntimeError("Every speech file failed during embedding extraction.")
    # Copies of one recording across patient folders invalidate held-out metrics.
    duplicated = manifest.groupby("audio_sha256")["patient_id"].nunique()
    if (duplicated > 1).any():
        raise ValueError("Identical speech recordings were assigned to different patient IDs; resolve the duplicate audio before training")
    manifest.to_csv(output / "speech_sequence_manifest.csv", index=False)
    pd.DataFrame(failures).to_csv(output / "speech_embedding_failures.csv", index=False)
    print(manifest.groupby("label").agg(recordings=("label", "size"), patients=("patient_id", "nunique")))
    print(f"Saved {len(manifest)} sequence records to {output}")


if __name__ == "__main__":
    main()
