"""Shared risk-scoring constants.

Imported by both models and services, so it must not import either
(keeps the dependency graph acyclic).
"""

from django.db import models


class RiskCategory(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


# Factor keys — the identity of each pluggable contributor. Weights and
# breakdowns are keyed by these.
FACTOR_RAINFALL = "rainfall"
FACTOR_SUSCEPTIBILITY = "susceptibility"

FACTOR_KEYS = (FACTOR_RAINFALL, FACTOR_SUSCEPTIBILITY)

# Default composite weights (must sum to 1.0). Tunable per RiskConfig.
DEFAULT_WEIGHTS = {
    FACTOR_RAINFALL: 0.5,
    FACTOR_SUSCEPTIBILITY: 0.5,
}

# Lower bound (inclusive) of each category on the 0-100 composite scale.
# Anything below the lowest bound is LOW.
DEFAULT_THRESHOLDS = {
    RiskCategory.MEDIUM: 25.0,
    RiskCategory.HIGH: 50.0,
    RiskCategory.CRITICAL: 75.0,
}

# Composite scale bounds.
SCORE_MIN = 0.0
SCORE_MAX = 100.0
