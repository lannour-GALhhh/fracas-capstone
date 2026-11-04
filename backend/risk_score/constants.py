"""Shared risk-scoring constants."""

from django.db import models


class RiskCategory(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


# Pluggable contributor keys; weights and breakdowns are keyed by these.
FACTOR_RAINFALL = "rainfall"
FACTOR_SUSCEPTIBILITY = "susceptibility"

FACTOR_KEYS = (FACTOR_RAINFALL, FACTOR_SUSCEPTIBILITY)

# Default composite weights (must sum to 1.0); only used in `weighted_sum` mode.
DEFAULT_WEIGHTS = {
    FACTOR_RAINFALL: 0.5,
    FACTOR_SUSCEPTIBILITY: 0.5,
}


# How the engine folds rainfall + susceptibility into one hazard.
COMBINATION_WEIGHTED_SUM = "weighted_sum"
COMBINATION_RAINFALL_GATED = "rainfall_gated"
COMBINATION_MODES = (COMBINATION_WEIGHTED_SUM, COMBINATION_RAINFALL_GATED)
DEFAULT_COMBINATION_MODE = COMBINATION_RAINFALL_GATED

# How a barangay's per-zone scores collapse to one headline number.
ZONE_AGG_MEAN = "mean"            # simple average across the zones present
ZONE_AGG_MAX = "max"             # worst-case zone (most cautious)
ZONE_AGG_AREA_WEIGHTED = "area_weighted"  # weighted by each zone's land area
ZONE_AGGREGATIONS = (ZONE_AGG_MEAN, ZONE_AGG_MAX, ZONE_AGG_AREA_WEIGHTED)
# Worst-zone: a barangay is as hazardous as its most flood-prone zone. Hindcast showed
# area-weighting dilutes mixed-zone barangays (33/45 vs 16/45 flood cases detected).
DEFAULT_ZONE_AGGREGATION = ZONE_AGG_MAX

# Rainfall-intensity curve (mm/hr -> 0-1 hazard), seeded from PAGASA bands.
DEFAULT_RAINFALL_CURVE = [
    [0.0, 0.0],
    [2.5, 0.05],
    [7.5, 0.25],
    [15.0, 0.55],
    [30.0, 0.85],
    [65.0, 1.0],
]

# Configurable 24h-accumulation (saturation) curve (mm -> 0-1 hazard). Calibrated so the
# standard 25/50/75 thresholds work: ~20 mm/24h is clearly wet ground, 60 mm is extreme.
DEFAULT_ACCUMULATION_CURVE = [
    [0.0, 0.0],
    [7.5, 0.35],
    [20.0, 0.65],
    [40.0, 0.9],
    [60.0, 1.0],
]

# Saturation only counts in full when it is raining at least this hard (mm/hr). Below it the
# saturation hazard is scaled down proportionally, so a day of steady drizzle (e.g. 2 mm/h =
# 48 mm/24h) reads MEDIUM at worst rather than HIGH. 0 disables the gate.
SATURATION_GATE_MM_HR = 6.0

# Lower bound (inclusive) of each category on the 0-100 composite scale.
DEFAULT_THRESHOLDS = {
    RiskCategory.MEDIUM: 25.0,
    RiskCategory.HIGH: 50.0,
    RiskCategory.CRITICAL: 75.0,
}

# Composite scale bounds.
SCORE_MIN = 0.0
SCORE_MAX = 100.0
