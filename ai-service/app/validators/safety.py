from pydantic import BaseModel, Field


class SafetyDisclosure(BaseModel):
    medical_disclaimer: str = Field(
        default=(
            "FITCORE AI output is for informational fitness and general wellness guidance only. "
            "It is not medical advice; consult a qualified healthcare professional or registered "
            "dietitian for clinical conditions."
        )
    )
    professional_review_recommended: bool = False
    allergy_checked: bool = True
    uncertainty_note: str | None = None


def check_medical_flags(limitations: str | None, allergies: list[str]) -> SafetyDisclosure:
    needs_review = bool(limitations and limitations.strip()) or len(allergies) > 0
    return SafetyDisclosure(
        professional_review_recommended=needs_review,
        allergy_checked=True,
    )
