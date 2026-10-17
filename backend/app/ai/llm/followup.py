"""Fixed screening guidance appended after generation so it cannot be omitted by an LLM."""


def followup_text(prediction: dict) -> str:
    label = prediction.get("prediction")
    if label == "Dementia":
        return (
            "This result indicates a higher screening risk. NeuroMind cannot diagnose dementia.\n\n"
            "### What to do\n"
            "- Arrange an appointment with a qualified doctor for a full assessment.\n"
            "- Bring this report, notes about any changes in memory or thinking, and a list of your medicines to the appointment.\n"
            "- Share the report with a doctor you choose if you want them to review it.\n\n"
            "### What to avoid\n"
            "- Do not treat this screening result as a diagnosis or delay a medical assessment.\n"
            "- Do not start, stop, or change medicines because of this report without speaking to a qualified clinician."
        )
    if label == "Non-Dementia":
        return (
            "This result indicates a lower screening risk. A lower screening risk does not rule out a medical condition.\n\n"
            "### What to do\n"
            "- If memory or thinking concerns continue, arrange an appointment with a qualified doctor.\n"
            "- Note when the changes happen and bring the notes and your medicine list to the appointment.\n\n"
            "### What to avoid\n"
            "- Do not assume this screening result rules out a medical condition or ignore persistent concerns.\n"
            "- Do not start, stop, or change medicines because of this report without speaking to a qualified clinician."
        )
    raise ValueError("A validated binary screening result is required for follow-up guidance.")


def append_followup(report_text: str, prediction: dict) -> str:
    if "## NeuroMind follow-up guidance" in report_text:
        raise ValueError("Report already has patient follow-up guidance.")
    return report_text.rstrip() + "\n\n## NeuroMind follow-up guidance\n" + followup_text(prediction)
