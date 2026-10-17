"""Export a trained Colab model with the contract NeuroMind needs.

Copy this file into Colab or import it from the repository. Never guess the
feature order: pass the exact columns used during training.
"""

import json
from pathlib import Path


def _write_manifest(artifact, framework, input_features, class_labels, version):
    artifact = Path(artifact)
    manifest = {
        "name": f"neuromind-{artifact.parent.name}",
        "version": version,
        "framework": framework,
        "input_features": list(input_features),
        "class_labels": [str(label) for label in class_labels],
        "output_type": "probabilities",
    }
    path = artifact.with_name(f"{artifact.name}.manifest.json")
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return str(artifact), str(path)


def export_sklearn(model, output_path, input_features, class_labels=None, version="1.0.0"):
    import joblib

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output)
    labels = class_labels if class_labels is not None else getattr(model, "classes_", [])
    return _write_manifest(output, "sklearn", input_features, labels, version)


def export_keras(model, output_path, input_features, class_labels, version="1.0.0"):
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    model.save(output)
    return _write_manifest(output, "keras", input_features, class_labels, version)


def export_torchscript(model, example_input, output_path, input_features, class_labels, version="1.0.0"):
    import torch

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    model.eval()
    traced = torch.jit.trace(model, example_input)
    traced.save(str(output))
    return _write_manifest(output, "torchscript", input_features, class_labels, version)
