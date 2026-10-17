from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd

from training.common import canonical_label, load_label_map, sha256, write_json


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


ALIASES = {
    "patient_id": ["patient_id", "patientid", "participant_id", "subject_id"],
    "label": ["label", "class", "diagnosis", "target"],
    "memory_score": ["memory_score"],
    "immediate_recall": ["immediate_recall", "immediate_recall_score"],
    "delayed_recall": ["delayed_recall", "delayed_recall_score"],
    "recognition_score": ["recognition_score", "recognition_accuracy"],
    "attention_score": ["attention_score"],
    "digit_span": ["digit_span", "digit_span_score", "digit_span_max_score"],
    "reaction_time_ms": ["reaction_time_ms", "reaction_time", "reactiontimems"],
    "sustained_attention_score": ["sustained_attention_score", "sustained_attention"],
    "sleep_hours": ["sleep_hours", "sleephours"],
    "sleep_quality": ["sleep_quality", "sleepquality"],
    "exercise_hours_week": ["exercise_hours_week", "exercisehoursweek", "exercise_hours"],
    "smoking": ["smoking", "smoking_status"],
    "alcohol_use": ["alcohol_use", "alcoholuse", "alcohol_status"],
    "medical_history": ["medical_history", "medicalhistory"],
    "lifestyle_score": ["lifestyle_score", "overall_lifestyle_score"],
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--speech", required=True, help="speech_patient_embeddings.csv")
    parser.add_argument("--memory", required=True)
    parser.add_argument("--attention", required=True)
    parser.add_argument("--lifestyle", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--label-map")
    return parser.parse_args()


def canonical_columns(frame: pd.DataFrame, expected: list[str]) -> pd.DataFrame:
    normalized = {
        str(column).strip().lower().replace(" ", "_").replace("-", "_"): column
        for column in frame.columns
    }
    rename = {}
    for canonical in ["patient_id", "label", *expected]:
        source = next((normalized[name] for name in ALIASES[canonical] if name in normalized), None)
        if source is None:
            raise ValueError(f"Missing required column {canonical}; found {list(frame.columns)}")
        rename[source] = canonical
    keep = list(rename)
    return frame[keep].rename(columns=rename)


def range_number(value, mapping):
    if pd.isna(value):
        return None
    key = str(value).strip().lower()
    if key in mapping:
        return mapping[key]
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def encode_lifestyle(frame: pd.DataFrame) -> pd.DataFrame:
    sleep = {"<4": 3.5, "5-6": 5.5, "7-8": 7.5, "9-10": 9.5, ">10": 10.5}
    exercise = {"<1": 0.5, "1-2": 1.5, "3-5": 4.0, "6-10": 8.0, ">10": 11.0}
    quality = {"bad": 0.0, "moderate": 1.0, "good": 2.0}
    alcohol = {"none": 0.0, "occasional": 1.0, "frequent": 2.0}
    frame["sleep_hours"] = frame["sleep_hours"].map(lambda value: range_number(value, sleep))
    frame["sleep_quality"] = frame["sleep_quality"].map(lambda value: range_number(value, quality))
    frame["exercise_hours_week"] = frame["exercise_hours_week"].map(
        lambda value: range_number(value, exercise)
    )
    frame["smoking"] = frame["smoking"].map(
        lambda value: 1.0
        if str(value).strip().lower() in {"1", "true", "yes", "current"}
        else 0.0
    )
    frame["alcohol_use"] = frame["alcohol_use"].map(lambda value: range_number(value, alcohol))

    def history_score(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            text = str(value).strip()
            if not text or text.lower() == "none":
                return 0.0
            values = [item.strip() for item in text.replace(";", ",").split(",")]
            return float(len([item for item in values if item and item.lower() != "none"]))

    frame["medical_history"] = frame["medical_history"].map(history_score)
    return frame


def main():
    args = parse_args()
    label_map = load_label_map(args.label_map)
    # Keep literal questionnaire values such as "None" instead of allowing
    # pandas to interpret them as missing values.
    speech = pd.read_csv(args.speech, keep_default_na=False)
    speech_provenance = json.loads(Path(f"{args.speech}.manifest.json").read_text(encoding="utf-8"))
    if speech_provenance.get("csv_sha256") != sha256(args.speech):
        raise ValueError("Speech embeddings changed after model export; provenance is invalid.")
    speech.columns = [str(column).strip() for column in speech.columns]
    required_speech = {"patient_id", "label", "split"}
    if missing := required_speech - set(speech.columns):
        raise ValueError(f"Speech embeddings are missing: {sorted(missing)}")
    speech_columns = sorted(
        [column for column in speech.columns if column.startswith("speech_embedding_")],
        key=lambda value: int(value.rsplit("_", 1)[1]),
    )
    if not speech_columns:
        raise ValueError("No speech_embedding_* columns were found.")
    if len(speech_columns) != int(speech_provenance.get("embedding_dim", -1)):
        raise ValueError("Speech embedding columns do not match their exported model.")

    memory = canonical_columns(
        pd.read_csv(args.memory, keep_default_na=False),
        ["memory_score", "immediate_recall", "delayed_recall", "recognition_score"],
    )
    attention = canonical_columns(
        pd.read_csv(args.attention, keep_default_na=False),
        ["attention_score", "digit_span", "reaction_time_ms", "sustained_attention_score"],
    )
    lifestyle = canonical_columns(
        pd.read_csv(args.lifestyle, keep_default_na=False),
        [
            "sleep_hours",
            "sleep_quality",
            "exercise_hours_week",
            "smoking",
            "alcohol_use",
            "medical_history",
            "lifestyle_score",
        ],
    )
    lifestyle = encode_lifestyle(lifestyle)

    sources = {"speech": speech, "memory": memory, "attention": attention, "lifestyle": lifestyle}
    for name, frame in sources.items():
        frame["patient_id"] = frame["patient_id"].astype(str)
        frame["label"] = frame["label"].map(lambda value: canonical_label(value, label_map))
        if frame["patient_id"].duplicated().any():
            raise ValueError(f"{name} data contains duplicate patient rows.")

    result = speech[["patient_id", "label", "split", *speech_columns]].rename(
        columns={"label": "speech_label"}
    )
    for name, frame in (("memory", memory), ("attention", attention), ("lifestyle", lifestyle)):
        feature_names = [column for column in frame.columns if column not in {"patient_id", "label"}]
        renamed = frame.rename(columns={"label": f"{name}_label"})
        result = result.merge(
            renamed[["patient_id", f"{name}_label", *feature_names]],
            on="patient_id",
            how="inner",
            validate="one_to_one",
        )

    label_columns = ["speech_label", "memory_label", "attention_label", "lifestyle_label"]
    conflicts = result[label_columns].nunique(axis=1) != 1
    if conflicts.any():
        raise ValueError(
            "Labels disagree across modalities for patients: "
            + ", ".join(result.loc[conflicts, "patient_id"].head(10))
        )
    result["label"] = result["speech_label"]
    result = result.drop(columns=label_columns)
    feature_columns = [*speech_columns, *TABULAR_FEATURES]
    for column in feature_columns:
        result[column] = pd.to_numeric(result[column], errors="coerce")
    missing_rows = result[feature_columns].isna().any(axis=1)
    if missing_rows.any():
        report_path = Path(args.output).with_suffix(".missing.json")
        report_path.write_text(
            json.dumps(
                result.loc[missing_rows, ["patient_id", *feature_columns]]
                .isna()
                .apply(lambda row: [column for column, value in row.items() if value], axis=1)
                .to_dict(),
                indent=2,
            ),
            encoding="utf-8",
        )
        raise ValueError(f"Incomplete fusion rows detected; see {report_path}")
    result = result[["patient_id", "label", "split", *feature_columns]]
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False)
    write_json(f"{args.output}.manifest.json", {
        "speech_artifact_sha256": speech_provenance["speech_artifact_sha256"],
        "input_features": feature_columns,
        "csv_sha256": sha256(args.output),
    })
    print(result.groupby(["split", "label"]).size())
    print(f"Saved {len(result)} aligned patients and {len(feature_columns)} model features")


if __name__ == "__main__":
    main()
