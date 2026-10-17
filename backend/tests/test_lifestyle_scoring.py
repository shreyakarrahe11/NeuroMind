from app.utils.lifestyle_scoring import calculate_lifestyle_score


def test_lifestyle_preprocessing_is_bounded_and_directional():
    supportive = calculate_lifestyle_score({
        "sleepHours": "7-8",
        "sleepQuality": "Good",
        "exerciseHoursWeek": "3-5",
        "smoking": False,
        "alcoholUse": "None",
        "medicalHistory": ["None"],
        "socialActivity": "Daily",
    })
    adverse = calculate_lifestyle_score({
        "sleepHours": "<4",
        "sleepQuality": "Bad",
        "exerciseHoursWeek": "<1",
        "smoking": True,
        "alcoholUse": "Frequent",
        "medicalHistory": ["Hypertension", "Diabetes"],
        "socialActivity": "Rarely",
    })

    assert 0 <= adverse < supportive <= 100
