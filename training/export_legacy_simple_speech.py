"""Export the selected Colab simple BiLSTM checkpoint for NeuroMind inference.

The older checkpoint was trained on the first eight seconds of Wav2Vec2
representations. This exporter preserves that architecture and gives its
256-value pooled state to the future binary fusion model. The checkpoint is a
research baseline, not a clinically validated detector.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from training.common import sha256, write_json


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--backbone-dir", required=True)
    args = parser.parse_args()

    import json
    import torch
    from torch import nn

    backbone = Path(args.backbone_dir)
    metadata = json.loads((backbone / "neuromind_backbone.json").read_text())
    configuration = json.loads((backbone / "config.json").read_text())
    if metadata.get("source_model") != "facebook/wav2vec2-base-960h" or configuration.get("hidden_size") != 768:
        raise ValueError("The saved backbone does not match the Colab speech checkpoint.")

    class SimpleBiLSTMClassifier(nn.Module):
        def __init__(self):
            super().__init__()
            self.bilstm = nn.LSTM(768, 128, num_layers=1, batch_first=True, bidirectional=True)
            self.dropout = nn.Dropout(0.30)
            self.classifier = nn.Sequential(nn.Linear(256, 64), nn.ReLU(), nn.Dropout(0.30), nn.Linear(64, 2))

        def forward(self, x):
            encoded, _ = self.bilstm(x)
            pooled = self.dropout(encoded.mean(dim=1))
            return self.classifier(pooled), pooled

    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    if not isinstance(checkpoint, dict) or "simple_model" not in checkpoint:
        raise ValueError("Expected the Colab simple_model checkpoint; no arbitrary state dict accepted.")
    model = SimpleBiLSTMClassifier().eval()
    model.load_state_dict(checkpoint["simple_model"], strict=True)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    artifact = output / "neuromind_speech_bilstm_binary.pt"
    torch.jit.script(model).save(str(artifact))
    manifest = {
        "name": "neuromind-colab-simple-bilstm-baseline",
        "version": "legacy-colab-binary-1",
        "framework": "torchscript",
        "task": "speech_sequence_encoder",
        "class_labels": ["Non-Dementia", "Dementia"],
        "sequence_input": True,
        "input_dim": 768,
        "embedding_dim": 256,
        "max_audio_seconds": 8,
        "wav2vec_model": metadata["source_model"],
        "output_type": "logits",
        "artifact_sha256": sha256(artifact),
        "validation_note": "Older selected binary baseline; clinical accuracy is not established.",
    }
    write_json(f"{artifact}.manifest.json", manifest)
    loaded = torch.jit.load(str(artifact), map_location="cpu").eval()
    with torch.inference_mode():
        logits, embedding = loaded(torch.randn(1, 20, 768))
    if tuple(logits.shape) != (1, 2) or tuple(embedding.shape) != (1, 256):
        raise RuntimeError("Exported speech model has an incompatible output shape.")
    print({"artifact": str(artifact), "status": "EXPORTED", "embedding_dim": 256})


if __name__ == "__main__":
    main()
