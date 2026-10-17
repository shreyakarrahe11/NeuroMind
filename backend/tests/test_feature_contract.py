from types import SimpleNamespace

from app.ai.feature_contract import TABULAR_FEATURES, build_multimodal_features, sustained_attention_score


def test_sustained_attention_uses_all_media_tasks():
    data = {
        "visualAttention": {"targetCount": 2, "hits": 2, "falseAlarms": 0},
        "audioAttention": {"targetCount": 2, "hits": 1, "falseAlarms": 0},
        "musicAttention": {"targetCount": 2, "hits": 2, "falseAlarms": 1},
        "videoAttention": {"targetCount": 2, "hits": 1, "falseAlarms": 0},
    }
    assert sustained_attention_score(data) == 62.5


def test_online_feature_contract_matches_training_names():
    session = SimpleNamespace(
        memory=SimpleNamespace(
            memory_score=70.0,
            immediate_recall=80.0,
            delayed_recall=60.0,
            recognition_score=75.0,
        ),
        attention=SimpleNamespace(
            attention_score=68.0,
            reaction_time=410.0,
            raw_response_json={
                "digitSpanMaxScore": 6,
                "sustainedAttentionScore": 72,
            },
        ),
        lifestyle=SimpleNamespace(
            overall_lifestyle_score=81.0,
            responses_json={
                "sleepHours": "7-8",
                "sleepQuality": "Good",
                "exerciseHoursWeek": "3-5",
                "smoking": False,
                "alcoholUse": "Occasional",
                "medicalHistory": ["Hypertension"],
            },
        ),
        speech=SimpleNamespace(
            features=[
                SimpleNamespace(feature_name="embedding_0", feature_value=0.25),
                SimpleNamespace(feature_name="speech_embedding_1", feature_value=-0.5),
            ]
        ),
    )
    features = build_multimodal_features(session)
    assert all(name in features for name in TABULAR_FEATURES)
    assert features["sleep_hours"] == 7.5
    assert features["sleep_quality"] == 2.0
    assert features["exercise_hours_week"] == 4.0
    assert features["medical_history"] == 1.0
    assert features["speech_embedding_0"] == 0.25
    assert features["speech_embedding_1"] == -0.5

