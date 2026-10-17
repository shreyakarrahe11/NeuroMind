
from enum import Enum
from pathlib import Path


class ModelState(str, Enum):
    READY = "READY"
    PENDING_MODEL = "PENDING_MODEL"
    CONFIG_REQUIRED = "CONFIG_REQUIRED"
    FAILED = "FAILED"


class PendingModelError(RuntimeError):
    """Raised when real inference cannot run because an artifact is absent."""


class ModelAdapter:
    name = "base"
    supported_suffixes: set[str] = set()

    def __init__(self, path):
        self.path = Path(path).expanduser() if path else None
        self.model = None
        self.load_error: str | None = None

    def status(self):
        if not self.path or not self.path.exists():
            return ModelState.PENDING_MODEL
        if self.supported_suffixes and self.path.suffix.lower() not in self.supported_suffixes:
            return ModelState.CONFIG_REQUIRED
        if self.load_error:
            return ModelState.FAILED
        return ModelState.READY

    def status_detail(self):
        return {
            "name": self.name,
            "state": self.status().value,
            "configured": bool(self.path),
            "artifactExists": bool(self.path and self.path.exists()),
            "artifactName": self.path.name if self.path else None,
            "error": self.load_error,
        }

    def load_model(self):
        if self.status() != ModelState.READY:
            raise PendingModelError(
                f"{self.name} model artifact is missing or unsupported. "
                f"Run `npm run models:status` for details."
            )
        return self.model

    def predict(self, input_data):
        raise NotImplementedError
