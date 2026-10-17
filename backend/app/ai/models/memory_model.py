from .generic import GenericModelAdapter
from ...core.config import settings
class MemoryModelService(GenericModelAdapter):
    name="memory"
    def __init__(self): super().__init__(settings.memory_model_path)
