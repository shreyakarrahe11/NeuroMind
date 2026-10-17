
import json
import hashlib
import math
import pickle

try:
    import joblib
except ImportError:  # pragma: no cover - optional loader
    joblib = None

from ..base import ModelAdapter, ModelState, PendingModelError


DEFAULT_LABELS = {
    0: "Non-Dementia",
    1: "Dementia",
    "0": "Non-Dementia",
    "1": "Dementia",
}


class GenericModelAdapter(ModelAdapter):
    """Manifest-driven loader for common Colab export formats.

    A manifest keeps feature order and class meaning explicit. It can be named
    ``model.joblib.manifest.json`` beside the artifact or ``manifest.json`` in
    the artifact directory.
    """

    supported_suffixes = {".joblib", ".pkl", ".pickle", ".keras", ".h5", ".pt", ".pth", ".onnx"}

    def __init__(self, path):
        super().__init__(path)
        self.manifest = self._read_manifest()
        self._actual_checksum = None

    def _checksum(self):
        if self._actual_checksum is not None:
            return self._actual_checksum
        if not self.path or not self.path.is_file():
            return None
        digest = hashlib.sha256()
        with self.path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(block)
        self._actual_checksum = digest.hexdigest()
        return self._actual_checksum

    def status(self):
        state = super().status()
        if state != ModelState.READY:
            return state
        expected = str(self.manifest.get("artifact_sha256") or "").strip().lower()
        if len(expected) != 64:
            self.load_error = "Model manifest must contain artifact_sha256."
            return ModelState.CONFIG_REQUIRED
        if self._checksum() != expected:
            self.load_error = "Model artifact checksum does not match its manifest."
            return ModelState.FAILED
        return ModelState.READY

    def _manifest_path(self):
        if not self.path:
            return None
        beside = self.path.with_name(f"{self.path.name}.manifest.json")
        directory = self.path.parent / "manifest.json"
        return beside if beside.exists() else directory if directory.exists() else None

    def _read_manifest(self):
        path = self._manifest_path()
        if not path:
            return {}
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                raise ValueError("manifest root must be a JSON object")
            return data
        except Exception as exc:
            self.load_error = f"Invalid model manifest: {exc}"
            return {}

    def status_detail(self):
        detail = super().status_detail()
        detail.update({
            "framework": self.manifest.get("framework"),
            "version": self.manifest.get("version"),
            "manifestFound": self._manifest_path() is not None,
            "inputFeatureCount": len(self.manifest.get("input_features", [])),
            "classLabels": self.manifest.get("class_labels", []),
            "checksumVerified": bool(
                self.path and self.path.is_file()
                and self._checksum() == str(self.manifest.get("artifact_sha256") or "").lower()
            ),
        })
        return detail

    def load_model(self):
        if self.status() != ModelState.READY:
            return super().load_model()
        if self.model is not None:
            return self.model
        suffix = self.path.suffix.lower()
        try:
            if suffix == ".joblib":
                if joblib is None:
                    raise RuntimeError("joblib is not installed")
                self.model = joblib.load(self.path)
            elif suffix in {".pkl", ".pickle"}:
                with self.path.open("rb") as stream:
                    self.model = pickle.load(stream)
            elif suffix in {".keras", ".h5"}:
                from tensorflow import keras
                self.model = keras.models.load_model(self.path)
            elif suffix in {".pt", ".pth"}:
                import torch
                self.model = torch.jit.load(str(self.path), map_location="cpu")
                self.model.eval()
            elif suffix == ".onnx":
                import onnxruntime
                self.model = onnxruntime.InferenceSession(str(self.path))
            else:  # guarded by status(), retained for a precise error
                raise RuntimeError(f"Unsupported model format: {suffix}")
        except Exception as exc:
            self.load_error = str(exc)
            raise PendingModelError(f"Unable to load {self.name} model: {exc}") from exc
        return self.model

    def _feature_names(self, rows, model):
        names = self.manifest.get("input_features") or []
        if not names and hasattr(model, "feature_names_in_"):
            names = [str(value) for value in model.feature_names_in_]
        if not names and rows and isinstance(rows[0], dict):
            names = list(rows[0].keys())
        return names

    def prepare_input(self, input_data, model=None):
        model = model or self.load_model()
        rows = input_data if isinstance(input_data, list) else [input_data]
        if not rows:
            raise ValueError("Inference input cannot be empty")
        if not isinstance(rows[0], dict):
            return rows
        names = self._feature_names(rows, model)
        missing = sorted({name for row in rows for name in names if row.get(name) is None})
        if missing:
            raise ValueError(f"Missing required model features: {', '.join(missing)}")
        try:
            import pandas as pd
            return pd.DataFrame([{name: row[name] for name in names} for row in rows], columns=names)
        except ImportError:
            return [[row[name] for name in names] for row in rows]

    def _label(self, value, class_labels):
        if class_labels:
            try:
                index = int(value)
                if 0 <= index < len(class_labels):
                    return str(class_labels[index])
            except (TypeError, ValueError):
                pass
        return DEFAULT_LABELS.get(value, str(value))

    @staticmethod
    def _vector(value):
        if hasattr(value, "detach"):
            value = value.detach().cpu().numpy()
        if hasattr(value, "tolist"):
            value = value.tolist()
        while isinstance(value, list) and len(value) == 1 and isinstance(value[0], list):
            value = value[0]
        return value if isinstance(value, list) else [value]

    def _neural_output(self, model, prepared):
        suffix = self.path.suffix.lower()
        if suffix in {".keras", ".h5"}:
            return model.predict(prepared, verbose=0)
        if suffix in {".pt", ".pth"}:
            import torch
            values = prepared.values if hasattr(prepared, "values") else prepared
            with torch.no_grad():
                return model(torch.tensor(values, dtype=torch.float32))
        if suffix == ".onnx":
            import numpy as np
            values = prepared.values if hasattr(prepared, "values") else prepared
            input_name = model.get_inputs()[0].name
            return model.run(None, {input_name: np.asarray(values, dtype=np.float32)})[0]
        return model.predict(prepared)

    def predict(self, input_data):
        model = self.load_model()
        prepared = self.prepare_input(input_data, model)
        class_labels = self.manifest.get("class_labels") or []

        if hasattr(model, "predict_proba"):
            probabilities = self._vector(model.predict_proba(prepared)[0])
            raw_classes = list(getattr(model, "classes_", range(len(probabilities))))
            if not class_labels and len(probabilities) == 2 and raw_classes in ([0, 1], ["0", "1"]):
                class_labels = ["Non-Dementia", "Dementia"]
        else:
            output = self._vector(self._neural_output(model, prepared))
            if len(output) == 1:
                probability = float(output[0])
                probabilities = [1.0 - probability, probability]
                raw_classes = list(range(2))
                if not class_labels:
                    class_labels = ["Non-Dementia", "Dementia"]
            else:
                probabilities = [float(value) for value in output]
                raw_classes = list(range(len(probabilities)))

            if self.manifest.get("output_type") == "logits":
                ceiling = max(probabilities)
                exponentials = [math.exp(value - ceiling) for value in probabilities]
                total = sum(exponentials)
                probabilities = [value / total for value in exponentials]

        labels = (
            [str(value) for value in class_labels]
            if class_labels and len(class_labels) == len(probabilities)
            else [self._label(value, []) for value in raw_classes]
        )
        class_probabilities = {label: float(probabilities[i]) for i, label in enumerate(labels)}
        best_index = max(range(len(probabilities)), key=lambda index: probabilities[index])
        dementia_probability = class_probabilities.get("Dementia")
        if dementia_probability is None and len(probabilities) == 2:
            dementia_probability = float(probabilities[-1])
        return {
            "label": labels[best_index],
            "probability": dementia_probability,
            "confidence": float(probabilities[best_index]),
            "class_probabilities": class_probabilities,
        }
