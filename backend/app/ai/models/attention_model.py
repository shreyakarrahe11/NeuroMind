from .generic import GenericModelAdapter
from ...core.config import settings
class AttentionModelService(GenericModelAdapter):
    name="attention"
    def __init__(self): super().__init__(settings.attention_model_path)
