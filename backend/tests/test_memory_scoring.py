from app.utils.memory_scoring import calculate_memory_scores


def test_perfect_memory_score_is_one_hundred():
    scores = calculate_memory_scores(
        immediate_recall=10,
        delayed_recall=10,
        recognition_true_positives=10,
        recognition_false_positives=0,
        recognition_total_correct=20,
    )

    assert scores.memory_score == 100.0
    assert scores.recognition_accuracy == 100.0


def test_false_recognition_is_penalized_and_bounded():
    scores = calculate_memory_scores(
        immediate_recall=5,
        delayed_recall=4,
        recognition_true_positives=4,
        recognition_false_positives=6,
        recognition_total_correct=8,
    )

    assert scores.immediate_recall == 50.0
    assert scores.delayed_recall == 40.0
    assert scores.recognition_accuracy == 25.0
    assert scores.memory_score == 38.5
