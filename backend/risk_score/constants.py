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
# Only consulted in the legacy `weighted_sum` combination mode.
DEFAULT_WEIGHTS = {
    FACTOR_RAINFALL: 0.5,
    FACTOR_SUSCEPTIBILITY: 0.5,
}


# --- Combination modes -----------------------------------------------------
# How the engine folds rainfall + susceptibility into one hazard.
#   weighted_sum   — legacy additive `w_rain·rain + w_susc·susc` (kept for
#                    validation/back-compat; lets susceptibility score with no rain).
#   rainfall_gated — `rain × susc` per zone: no rain -> no risk (the recalibrated default).
COMBINATION_WEIGHTED_SUM = "weighted_sum"
COMBINATION_RAINFALL_GATED = "rainfall_gated"
COMBINATION_MODES = (COMBINATION_WEIGHTED_SUM, COMBINATION_RAINFALL_GATED)
DEFAULT_COMBINATION_MODE = COMBINATION_RAINFALL_GATED

# How a barangay's per-zone scores collapse to one headline number.
ZONE_AGG_MEAN = "mean"            # simple average across the zones present
ZONE_AGG_MAX = "max"             # worst-case zone (most cautious)
ZONE_AGG_AREA_WEIGHTED = "area_weighted"  # weighted by each zone's land area
ZONE_AGGREGATIONS = (ZONE_AGG_MEAN, ZONE_AGG_MAX, ZONE_AGG_AREA_WEIGHTED)
DEFAULT_ZONE_AGGREGATION = ZONE_AGG_MEAN

# Configurable rainfall-intensity curve (mm/hr -> 0-1 hazard), seeded from PAGASA
# intensity bands with a deliberately steep low end so drizzle barely registers:
# 3 mm/hr ~= 0.06 (insufficient), 20 mm/hr ~= 0.65 (strong).
DEFAULT_RAINFALL_CURVE = [
    [0.0, 0.0],
    [2.5, 0.05],
    [7.5, 0.25],
    [15.0, 0.55],
    [30.0, 0.85],
    [65.0, 1.0],
]

# Configurable 24h-accumulation (saturation) curve (mm -> 0-1 hazard).
DEFAULT_ACCUMULATION_CURVE = [
    [0.0, 0.0],
    [50.0, 0.33],
    [100.0, 0.66],
    [200.0, 1.0],
]

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
