import pytest

from app.ai.llm.report_validation import validate_report_text


def test_evidence_citations_are_required_and_bounded():
    evidence = [{"chunkId": "one"}]
    assert validate_report_text("Screening outcome [KB1]", evidence) == "Screening outcome [KB1]"
    for invalid in ("Screening outcome", "Invented [KB2]", " ", "MCI risk [KB1]"):
        with pytest.raises(ValueError):
            validate_report_text(invalid, evidence)
