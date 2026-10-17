from .generic import GenericModelAdapter
from ...core.config import settings
from ..base import ModelState
from ..feature_contract import TABULAR_FEATURES


class MultimodalModelService(GenericModelAdapter):
    name = "multimodal"

    def __init__(self):
        super().__init__(settings.multimodal_model_path)

    def status(self):
        state = super().status()
        if state != ModelState.READY:
            return state
        if not self.manifest.get("input_features"):
            self.load_error = "Multimodal manifest must define exact input_features."
            return ModelState.CONFIG_REQUIRED
        if self.manifest.get("class_labels") != ["Non-Dementia", "Dementia"]:
            self.load_error = "Final multimodal model must classify Non-Dementia and Dementia."
            return ModelState.CONFIG_REQUIRED
        speech_dim = self.manifest.get("speech_embedding_dim")
        try:
            speech_dim = int(speech_dim)
        except (ValueError, TypeError):
            speech_dim = 0
        expected = [f"speech_embedding_{index}" for index in range(speech_dim)] + TABULAR_FEATURES
        if speech_dim <= 0 or self.manifest.get("input_features") != expected:
            self.load_error = "Fusion features must match the ordered speech embedding and 15 website measurements."
            return ModelState.CONFIG_REQUIRED
        if self.manifest.get("task") != "binary_multimodal_screening":
            self.load_error = "Fusion model task must declare binary_multimodal_screening."
            return ModelState.CONFIG_REQUIRED
        speech_hash = str(self.manifest.get("speech_artifact_sha256") or "")
        if len(speech_hash) != 64 or any(character not in "0123456789abcdef" for character in speech_hash.lower()):
            self.load_error = "Fusion manifest must identify its exact speech encoder checksum."
            return ModelState.CONFIG_REQUIRED
        return ModelState.READY
