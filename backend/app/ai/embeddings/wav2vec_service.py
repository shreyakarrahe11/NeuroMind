from functools import lru_cache

from ...core.config import settings


class Wav2Vec2Service:
    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.wav2vec_model_name
        self.processor = None
        self.model = None
        self.device = settings.model_device

    def _load(self):
        try:
            from transformers import AutoModel, AutoProcessor
            import torch
        except ImportError as exc:
            raise RuntimeError("transformers and torch are required for Wav2Vec2") from exc
        if self.model is None:
            options = {"local_files_only": settings.wav2vec_local_files_only}
            self.processor = AutoProcessor.from_pretrained(self.model_name, **options)
            self.model = AutoModel.from_pretrained(self.model_name, **options)
            self.model.eval()
            self.model.to(self.device)
        return torch

    def embed_sequence(self, audio, sample_rate: int):
        torch = self._load()
        inputs = self.processor(
            audio,
            sampling_rate=sample_rate,
            return_tensors="pt",
            return_attention_mask=True,
        )
        inputs = {key: value.to(self.device) for key, value in inputs.items()}
        with torch.inference_mode():
            hidden = self.model(**inputs).last_hidden_state
        return hidden.squeeze(0).cpu().numpy()

    def embed(self, audio, sample_rate: int):
        return self.embed_sequence(audio, sample_rate).mean(axis=0)


@lru_cache(maxsize=1)
def wav2vec_service():
    return Wav2Vec2Service()
