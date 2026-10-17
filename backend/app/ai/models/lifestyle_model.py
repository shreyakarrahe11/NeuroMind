from .generic import GenericModelAdapter
from ...core.config import settings
class LifestyleModelService(GenericModelAdapter):
    name="lifestyle"
    def __init__(self): super().__init__(settings.lifestyle_model_path)
