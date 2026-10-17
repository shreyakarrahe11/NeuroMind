from .models.attention_model import AttentionModelService
from .models.lifestyle_model import LifestyleModelService
from .models.memory_model import MemoryModelService
from .models.multimodal_model import MultimodalModelService
from .models.speech_model import SpeechModelService


MODEL_SERVICES = (
    SpeechModelService,
    MemoryModelService,
    AttentionModelService,
    LifestyleModelService,
    MultimodalModelService,
)


def model_statuses():
    details = []
    required = {"speech", "multimodal"}
    for service in MODEL_SERVICES:
        item = service().status_detail()
        item["requiredForFinalInference"] = item["name"] in required
        item["role"] = (
            "trained artifact required"
            if item["name"] in required
            else "optional adapter; validated assessment scores feed fusion directly"
        )
        details.append(item)
    return details


def inference_ready():
    speech = SpeechModelService()
    fusion = MultimodalModelService()
    if speech.status().value != "READY" or fusion.status().value != "READY":
        return False
    try:
        return (
            int(speech.manifest["embedding_dim"]) == int(fusion.manifest["speech_embedding_dim"])
            and speech.manifest["artifact_sha256"] == fusion.manifest["speech_artifact_sha256"]
        )
    except (TypeError, ValueError, KeyError):
        return False
