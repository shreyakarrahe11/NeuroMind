import json

from app.ai.model_registry import model_statuses


if __name__ == "__main__":
    statuses = model_statuses()
    print(json.dumps({"models": statuses}, indent=2))
    if not next(item for item in statuses if item["name"] == "multimodal")["state"] == "READY":
        print("\nInference remains disabled until MULTIMODAL_MODEL_PATH points to a real artifact.")
