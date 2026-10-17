import pytest

from app.ai.llm.followup import append_followup


@pytest.mark.parametrize("label", ["Dementia", "Non-Dementia"])
def test_patient_report_has_actionable_do_and_avoid_sections(label):
    report = append_followup("## Screening outcome\nEvidence [KB1]", {"prediction": label})
    assert "### What to do" in report
    assert "### What to avoid" in report
    assert "qualified doctor" in report
    assert "medicines" in report
    assert "Do not" in report
    with pytest.raises(ValueError):
        append_followup(report, {"prediction": label})


def test_unknown_class_does_not_receive_lower_risk_advice():
    with pytest.raises(ValueError):
        append_followup("Report", {"prediction": "unknown"})
