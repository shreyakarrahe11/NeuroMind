"""Reject unusable generated reports before storing or sharing them."""

import re


_CITATION = re.compile(r"\[KB(\d+)\]")


def validate_report_text(value: str, evidence: list[dict]) -> str:
    text = (value or "").strip()
    if not text or len(text) > 25_000:
        raise ValueError("Report is empty or exceeds the maximum size")
    citations = {int(number) for number in _CITATION.findall(text)}
    if citations - set(range(1, len(evidence) + 1)):
        raise ValueError("Report references knowledge not supplied to the model")
    if evidence and not citations:
        raise ValueError("Report did not cite its supporting knowledge")
    if re.search(r"\b(?:prediction|outcome|classification|class|risk)\s*[:= -]*MCI\b|\bMCI\s+(?:class|risk|prediction|result)\b", text, re.IGNORECASE):
        raise ValueError("Report includes an unsupported third screening class")
    return text
