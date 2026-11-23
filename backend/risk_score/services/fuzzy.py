"""Fuzzy classification of a 0-100 hazard score into risk categories.

Each category is a fuzzy set over the score axis. Adjacent sets overlap across their configured
threshold: membership is 0.5/0.5 exactly at the threshold and ramps linearly over +/- `half_width`
points either side, so memberships always sum to 1 (a fuzzy partition). A score is assigned the
category with the highest membership (ties go to the more severe one), which keeps the crisp
threshold as the decision boundary while exposing *how firmly* a score sits in its category —
e.g. 48 reads 0.6 medium / 0.4 high, an early sign of escalation.

Pure functions, no model imports.
"""

from __future__ import annotations

from risk_score.constants import RiskCategory

# Overlap half-width in score points, capped at half the gap between neighbouring thresholds.
DEFAULT_HALF_WIDTH = 10.0
# Ascending severity.
_ORDER = (RiskCategory.LOW, RiskCategory.MEDIUM, RiskCategory.HIGH, RiskCategory.CRITICAL)


def _ramp_up(score: float, threshold: float, half_width: float) -> float:
    """0 below threshold-w, 1 above threshold+w, linear between (0.5 at the threshold)."""
    if half_width <= 0:
        return 1.0 if score >= threshold else 0.0
    return min(1.0, max(0.0, (score - (threshold - half_width)) / (2 * half_width)))


def memberships(score: float, thresholds: dict, half_width: float = DEFAULT_HALF_WIDTH) -> dict[str, float]:
    """Degree (0-1) to which `score` belongs to each category; values sum to 1."""
    bounds = [float(thresholds[c.value]) for c in _ORDER[1:]]  # medium, high, critical
    edges = [0.0, *bounds, 100.0]
    ups = []
    for i, t in enumerate(bounds):
        gap = min(t - edges[i], edges[i + 2] - t)
        ups.append(_ramp_up(score, t, min(half_width, gap / 2)))

    # P(at least category i+1) are nested ramps; a category's degree is the difference.
    nested = [1.0, *ups, 0.0]
    degrees = {}
    for i, cat in enumerate(_ORDER):
        degrees[cat.value] = round(max(0.0, nested[i] - nested[i + 1]), 4)
    return degrees


def classify(score: float, thresholds: dict, half_width: float = DEFAULT_HALF_WIDTH) -> tuple[RiskCategory, dict[str, float]]:
    """Highest-membership category (ties -> more severe) plus the full membership map."""
    degrees = memberships(score, thresholds, half_width)
    best = max(
        _ORDER,
        key=lambda c: (round(degrees[c.value], 6), _ORDER.index(c)),
    )
    return best, degrees
