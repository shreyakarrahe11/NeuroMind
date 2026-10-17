import math
import json
from pathlib import Path

from .generic import GenericModelAdapter
from ...core.config import settings
from ..base import ModelState


class SpeechModelService(GenericModelAdapter):
    """Adapter for the final Wav2Vec2 -> BiLSTM -> MHA speech encoder.

    The exported TorchScript artifact returns ``(logits, embedding)``.  The
    embedding is persisted as ``speech_embedding_*`` features and is the only
    speech representation consumed by the final fusion model.
    """

    name = "speech"

    def __init__(self):
        super().__init__(settings.speech_model_path)

    def status(self):
        state = super().status()
        if state != ModelState.READY:
            return state
        if not self.manifest:
            self.load_error = "Speech model manifest is required."
            return ModelState.CONFIG_REQUIRED
        if not self.manifest.get("sequence_input") or not self.manifest.get("embedding_dim"):
            self.load_error = "Speech manifest must define sequence_input and embedding_dim."
            return ModelState.CONFIG_REQUIRED
        if self.manifest.get("class_labels") != ["Non-Dementia", "Dementia"]:
            self.load_error = "Speech model must classify Non-Dementia and Dementia."
            return ModelState.CONFIG_REQUIRED
        try:
            input_dim = int(self.manifest.get("input_dim", 0))
        except (TypeError, ValueError):
            input_dim = 0
        if self.manifest.get("task") != "speech_sequence_encoder" or input_dim != 768:
            self.load_error = "Speech artifact must encode 768-value Wav2Vec2 sequences."
            return ModelState.CONFIG_REQUIRED
        configured_backbone = settings.wav2vec_model_name
        backbone_path = Path(configured_backbone)
        if backbone_path.is_dir():
            try:
                metadata = json.loads((backbone_path / "neuromind_backbone.json").read_text(encoding="utf-8"))
                config = json.loads((backbone_path / "config.json").read_text(encoding="utf-8"))
            except Exception as exc:
                self.load_error = f"Wav2Vec2 backbone metadata is incomplete: {exc}"
                return ModelState.CONFIG_REQUIRED
            if metadata.get("source_model") != self.manifest.get("wav2vec_model"):
                self.load_error = "Configured Wav2Vec2 backbone does not match the speech manifest."
                return ModelState.CONFIG_REQUIRED
            if str(config.get("hidden_size", "")) != str(input_dim):
                self.load_error = "Wav2Vec2 hidden size does not match speech model input_dim."
                return ModelState.CONFIG_REQUIRED
        elif configured_backbone != self.manifest.get("wav2vec_model"):
            self.load_error = "Wav2Vec2 model identifier does not match the speech manifest."
            return ModelState.CONFIG_REQUIRED
        return ModelState.READY

    def status_detail(self):
        detail = super().status_detail()
        detail.update({
            "sequenceInput": bool(self.manifest.get("sequence_input")),
            "embeddingDimension": self.manifest.get("embedding_dim"),
            "wav2vecModel": self.manifest.get("wav2vec_model"),
        })
        return detail

    @staticmethod
    def _as_list(value):
        if hasattr(value, "detach"):
            value = value.detach().cpu().numpy()
        if hasattr(value, "tolist"):
            value = value.tolist()
        while isinstance(value, list) and len(value) == 1 and isinstance(value[0], list):
            value = value[0]
        return value if isinstance(value, list) else [value]

    def encode_sequence(self, hidden_states):
        if self.path is None or self.path.suffix.lower() not in {".pt", ".pth"}:
            raise RuntimeError("The final speech encoder must be exported as TorchScript (.pt/.pth).")
        if not self.manifest.get("sequence_input"):
            raise RuntimeError("Speech model manifest must declare sequence_input=true.")

        import numpy as np
        import torch

        model = self.load_model()
        values = np.asarray(hidden_states, dtype=np.float32)
        if values.ndim == 2:
            values = values[None, :, :]
        if values.ndim != 3:
            raise ValueError("Speech hidden states must have shape [time, 768] or [batch, time, 768].")

        with torch.no_grad():
            output = model(torch.as_tensor(values, dtype=torch.float32))
        if not isinstance(output, (tuple, list)) or len(output) != 2:
            raise RuntimeError("Speech TorchScript model must return (logits, embedding).")
        logits, embedding = output
        logits = [float(value) for value in self._as_list(logits)]
        embedding = [float(value) for value in self._as_list(embedding)]

        expected_dim = self.manifest.get("embedding_dim")
        if expected_dim is not None and len(embedding) != int(expected_dim):
            raise RuntimeError(
                f"Speech embedding has {len(embedding)} values; manifest requires {expected_dim}."
            )

        output_type = str(self.manifest.get("output_type") or "logits").lower()
        if output_type == "probabilities":
            probabilities = logits
        elif len(logits) == 1:
            positive = 1.0 / (1.0 + math.exp(-logits[0]))
            probabilities = [1.0 - positive, positive]
        else:
            ceiling = max(logits)
            exponentials = [math.exp(value - ceiling) for value in logits]
            total = sum(exponentials)
            probabilities = [value / total for value in exponentials]

        labels = [str(value) for value in self.manifest.get("class_labels", [])]
        if len(labels) != len(probabilities):
            raise RuntimeError("Speech manifest class_labels do not match model output size.")
        class_probabilities = dict(zip(labels, probabilities))
        best = max(range(len(probabilities)), key=probabilities.__getitem__)
        return {
            "label": labels[best],
            "confidence": probabilities[best],
            "class_probabilities": class_probabilities,
            "embedding": embedding,
        }
