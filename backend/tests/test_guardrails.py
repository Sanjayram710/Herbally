from app.services.guardrails import sanitize_and_validate_claims, filter_safe_benefits


def test_guardrails_detects_prohibited_medical_claims():
    """Verify medical and disease cure claims are blocked."""
    unsafe_claim_1 = "This herbal bedsheet cures eczema and treats skin infections."
    is_safe, violations = sanitize_and_validate_claims(unsafe_claim_1)
    assert not is_safe
    assert len(violations) >= 1

    unsafe_claim_2 = "A clinical remedy that heals diseases overnight."
    is_safe, violations = sanitize_and_validate_claims(unsafe_claim_2)
    assert not is_safe


def test_guardrails_permits_safe_wellness_statements():
    """Verify supported natural wellness phrasing passes validation."""
    safe_claim = "100% GOTS organic cotton provides breathable comfort and gentle, soothing contact for sensitive skin."
    is_safe, violations = sanitize_and_validate_claims(safe_claim)
    assert is_safe
    assert len(violations) == 0


def test_filter_safe_benefits():
    """Verify filtering a list of mixed claims."""
    benefits = [
        "Naturally antibacterial and soothing on sensitive skin.",
        "Guaranteed cure for chronic psoriasis and dermatitis.",
        "Breathable satin weave keeps you cool in tropical weather."
    ]
    safe_list = filter_safe_benefits(benefits)
    assert len(safe_list) == 2
    assert "Guaranteed cure" not in safe_list[0]
    assert "Guaranteed cure" not in safe_list[1]
