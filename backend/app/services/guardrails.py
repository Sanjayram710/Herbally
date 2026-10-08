import re
from typing import List, Tuple

PROHIBITED_HEALTH_PATTERNS = [
    r"\bcures?\b",
    r"\btreats?\b.*(?:eczema|psoriasis|acne|insomnia|dermatitis)",
    r"\bmedical treatment\b",
    r"\bheals? diseases?\b",
    r"\bguaranteed cure\b",
    r"\bclinical remedy\b",
    r"\bprescribed for\b",
]


def sanitize_and_validate_claims(text: str) -> Tuple[bool, List[str]]:
    """
    Checks if text violates the strict non-negotiable rule:
    'Never make medical or health claims. Only state benefits explicitly supported
    by reliable product/brand source material.'
    """
    violations = []
    for pattern in PROHIBITED_HEALTH_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append(f"Prohibited health or medical claim detected matching pattern: '{pattern}'")
    
    is_safe = len(violations) == 0
    return is_safe, violations


def filter_safe_benefits(benefits: List[str]) -> List[str]:
    """Filters out any benefit statements that make unverified medical claims."""
    safe_benefits = []
    for benefit in benefits:
        is_safe, _ = sanitize_and_validate_claims(benefit)
        if is_safe:
            safe_benefits.append(benefit)
    return safe_benefits
