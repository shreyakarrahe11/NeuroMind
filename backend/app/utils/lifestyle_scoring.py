def _hours(value, default):
    if isinstance(value, (int, float)):
        return float(value)
    ranges = {"<4": 3.0, "5-6": 5.5, "7-8": 7.5, "9-10": 9.5, ">10": 11.0, "<1": 0.5, "1-2": 1.5, "3-5": 4.0, "6-10": 8.0}
    return ranges.get(str(value), default)


def calculate_lifestyle_score(data: dict) -> float:
    """Create a transparent 0-100 feature from questionnaire responses.

    This is a preprocessing feature, not a medical risk prediction.
    """
    score = 60.0
    sleep = _hours(data.get("sleepHours"), 7.0)
    exercise = _hours(data.get("exerciseHoursWeek"), 2.0)
    score += 12 if 7 <= sleep <= 9 else -12 if sleep < 5 else -4
    score += {"Good": 8, "Moderate": 0, "Bad": -8}.get(data.get("sleepQuality"), 0)
    score += 12 if exercise >= 3 else -8 if exercise < 1 else 2
    score -= 12 if data.get("smoking") else 0
    score += {"None": 4, "Occasional": 0, "Frequent": -8}.get(data.get("alcoholUse"), 0)
    history = set(data.get("medicalHistory") or [])
    score -= min(20, 4 * len(history.difference({"None"})))
    score += {"Daily": 8, "Several times a week": 5, "Occasionally": 0, "Rarely": -5}.get(data.get("socialActivity"), 0)
    return round(max(0.0, min(100.0, score)), 2)
