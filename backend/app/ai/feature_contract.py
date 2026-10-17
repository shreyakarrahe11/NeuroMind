"""Canonical feature contract shared by training and online inference.

The fusion model must receive the same feature names, units and encodings that
were used during training.  This module is deliberately free of model code so
it can be tested without installing PyTorch or Transformers.
"""

from __future__ import annotations

import re
from typing import Any


TABULAR_FEATURES = [
    "memory_score",
    "immediate_recall",
    "delayed_recall",
    "recognition_score",
    "attention_score",
    "digit_span",
    "reaction_time_ms",
    "sustained_attention_score",
    "sleep_hours",
    "sleep_quality",
    "exercise_hours_week",
    "smoking",
    "alcohol_use",
    "medical_history",
    "lifestyle_score",
]


_SLEEP_HOURS = {"<4": 3.5, "5-6": 5.5, "7-8": 7.5, "9-10": 9.5, ">10": 10.5}
_EXERCISE_HOURS = {"<1": 0.5, "1-2": 1.5, "3-5": 4.0, "6-10": 8.0, ">10": 11.0}
_SLEEP_QUALITY = {"bad": 0.0, "moderate": 1.0, "good": 2.0}
_ALCOHOL_USE = {"none": 0.0, "occasional": 1.0, "frequent": 2.0}


def _number(value: Any, mapping: dict[str, float] | None = None) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if mapping:
        mapped = mapping.get(text.lower())
        if mapped is not None:
            return mapped
    try:
        return float(text)
    except ValueError:
        return None


def _safe_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def _medical_history_score(data: dict[str, Any]) -> float:
    history = data.get("medicalHistory") or data.get("medical_history") or []
    if isinstance(history, str):
        history = [history]
    normalized = {
        str(item).strip().lower()
        for item in history
        if str(item).strip() and str(item).strip().lower() != "none"
    }
    for key in ("hypertension", "diabetes", "cardiovascular"):
        if data.get(key) is True:
            normalized.add(key)
    return float(len(normalized))


def _task_score(task: dict[str, Any] | None) -> tuple[int, int, int]:
    task = task or {}
    targets = int(task.get("targetCount") or task.get("totalStimuliCount") or 0)
    hits = int(task.get("hits") or 0)
    false_alarms = int(task.get("falseAlarms") or 0)
    return targets, hits, false_alarms


def sustained_attention_score(data: dict[str, Any]) -> float | None:
    """Return a stable 0-100 score across every available media task."""
    explicit = _number(data.get("sustainedAttentionScore"))
    if explicit is not None:
        return max(0.0, min(100.0, explicit))

    tasks = []
    for key in ("visualAttention", "audioAttention", "musicAttention", "videoAttention"):
        value = data.get(key)
        if isinstance(value, dict):
            tasks.append(value)
    if not tasks and isinstance(data.get("sustainedAttention"), dict):
        tasks.append(data["sustainedAttention"])
    if not tasks:
        return None

    targets = hits = false_alarms = 0
    for task in tasks:
        task_targets, task_hits, task_false_alarms = _task_score(task)
        targets += task_targets
        hits += task_hits
        false_alarms += task_false_alarms
    if targets <= 0:
        return None
    # Correct detections earn credit; false alarms are penalized once.  Clamp
    # so malformed browser events cannot create a score outside the contract.
    return max(0.0, min(100.0, 100.0 * (hits - false_alarms) / targets))


def build_multimodal_features(session) -> dict[str, float | None]:
    memory = session.memory
    attention = session.attention
    lifestyle = session.lifestyle
    attention_raw = dict(attention.raw_response_json or {}) if attention else {}
    lifestyle_raw = dict(lifestyle.responses_json or {}) if lifestyle else {}

    features: dict[str, float | None] = {
        "memory_score": memory.memory_score if memory else None,
        "immediate_recall": memory.immediate_recall if memory else None,
        "delayed_recall": memory.delayed_recall if memory else None,
        "recognition_score": memory.recognition_score if memory else None,
        "attention_score": attention.attention_score if attention else None,
        "digit_span": _number(
            attention_raw.get("digitSpanMaxScore", attention_raw.get("digitSpan"))
        ),
        "reaction_time_ms": (
            attention.reaction_time
            if attention and attention.reaction_time is not None
            else _number(
                attention_raw.get("reactionTimeMedianMs", attention_raw.get("reactionTimeMs"))
            )
        ),
        "sustained_attention_score": sustained_attention_score(attention_raw),
        "sleep_hours": _number(lifestyle_raw.get("sleepHours"), _SLEEP_HOURS),
        "sleep_quality": _number(lifestyle_raw.get("sleepQuality"), _SLEEP_QUALITY),
        "exercise_hours_week": _number(
            lifestyle_raw.get("exerciseHoursWeek"), _EXERCISE_HOURS
        ),
        "smoking": _number(lifestyle_raw.get("smoking")),
        "alcohol_use": _number(lifestyle_raw.get("alcoholUse"), _ALCOHOL_USE),
        "medical_history": _medical_history_score(lifestyle_raw),
        "lifestyle_score": lifestyle.overall_lifestyle_score if lifestyle else None,
    }

    if session.speech:
        for feature in session.speech.features:
            name = _safe_name(feature.feature_name)
            # Deep features are stored as ``embedding_0`` so the fusion input
            # becomes ``speech_embedding_0``.  Older rows that already include
            # the prefix remain compatible and are not double-prefixed.
            key = name if name.startswith("speech_") else f"speech_{name}"
            features[key] = feature.feature_value
    return features

