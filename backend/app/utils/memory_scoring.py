from dataclasses import dataclass


@dataclass(frozen=True)
class MemoryScores:
    immediate_recall: float
    delayed_recall: float
    recognition_accuracy: float
    memory_score: float


def calculate_memory_scores(
    *,
    immediate_recall: int,
    delayed_recall: int,
    recognition_true_positives: int,
    recognition_false_positives: int,
    recognition_total_correct: int,
) -> MemoryScores:
    """Convert the UI's validated raw metrics to stable 0-100 scores.

    Recall tasks each contain ten targets. Recognition contains ten targets and
    ten distractors, so total-correct is measured out of twenty. The composite
    weights delayed recall most heavily because it is the memory task's delayed
    retention measure. This is an application scoring contract, not a clinical
    diagnosis or a substitute for the trained memory model.
    """

    immediate_pct = round(immediate_recall * 10.0, 2)
    delayed_pct = round(delayed_recall * 10.0, 2)
    recognition_pct = round(recognition_total_correct * 5.0, 2)

    # Apply a small false-alarm penalty while keeping the final score bounded.
    recognition_adjusted = max(
        0.0,
        min(100.0, recognition_pct - recognition_false_positives * 2.5),
    )
    composite = round(
        0.30 * immediate_pct
        + 0.40 * delayed_pct
        + 0.30 * recognition_adjusted,
        2,
    )

    return MemoryScores(
        immediate_recall=immediate_pct,
        delayed_recall=delayed_pct,
        recognition_accuracy=round(recognition_adjusted, 2),
        memory_score=max(0.0, min(100.0, composite)),
    )
