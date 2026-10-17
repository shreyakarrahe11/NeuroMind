
class SHAPService:
    def explain(self, model, features, manifest=None, target_index=0):
        try:
            import shap
        except ImportError as exc:
            raise RuntimeError("shap is not installed") from exc

        names = list(features.columns) if hasattr(features, "columns") else []
        raw_values = features.values if hasattr(features, "values") else features
        suffix = str((manifest or {}).get("framework") or "").lower()
        if suffix == "torchscript":
            import numpy as np
            import torch

            sample = torch.as_tensor(np.asarray(raw_values), dtype=torch.float32)
            background_values = (manifest or {}).get("background_values")
            if background_values is None and hasattr(model, "feature_means"):
                background = model.feature_means.detach().float().reshape(1, -1)
            elif background_values is not None:
                background = torch.as_tensor([background_values], dtype=torch.float32)
            else:
                raise RuntimeError("Torch SHAP requires background_values in the model manifest")
            explained = shap.GradientExplainer(model, background).shap_values(sample)
            if isinstance(explained, list):
                values = explained[min(target_index, len(explained) - 1)][0]
            else:
                array = np.asarray(explained)
                if array.ndim == 3:
                    values = array[0, :, min(target_index, array.shape[2] - 1)]
                else:
                    values = array.reshape(-1)
        else:
            explanation = shap.Explainer(model, raw_values)(raw_values)
            values = explanation.values
            if getattr(values, "ndim", 1) == 3:
                values = values[0, :, min(target_index, values.shape[2] - 1)]
            elif getattr(values, "ndim", 1) > 1:
                values = values[0]

        values = list(values)
        if not names:
            names = [f"feature_{index}" for index in range(len(values))]
        feature_values = list(raw_values[0]) if hasattr(raw_values[0], "__iter__") else [raw_values[0]]
        rows = [
            {
                "feature_name": name,
                "feature_value": str(feature_values[index]),
                "importance_value": float(value),
                "direction": "positive" if float(value) > 0 else "negative",
                "method": "SHAP",
                "explained_class_index": int(target_index),
            }
            for index, (name, value) in enumerate(zip(names, values))
        ]
        return sorted(rows, key=lambda row: abs(row["importance_value"]), reverse=True)[:30]
