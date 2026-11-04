from django.db import models


class SusceptibilityLevel(models.TextChoices):
    VERY_LOW = "very_low", "Very Low"
    LOW = "low", "Low"
    MODERATE = "moderate", "Moderate"
    HIGH = "high", "High"
    VERY_HIGH = "very_high", "Very High"


# Keyed by the categorical `susc_level` label, not the numeric `Flood` field.
# Multiplier on rainfall hazard per susceptibility level: a very-low zone needs 2.5x the rain
# of a very-high zone to reach the same score, but is never zeroed out (hindcast: a steeper
# 0.2-1.0 scale dropped HIGH detection sharply for no discrimination gain).
SUSCEPTIBILITY_VALUES = {
    SusceptibilityLevel.VERY_LOW: 0.4,
    SusceptibilityLevel.LOW: 0.6,
    SusceptibilityLevel.MODERATE: 0.8,
    SusceptibilityLevel.HIGH: 0.95,
    SusceptibilityLevel.VERY_HIGH: 1.0,
}

UTM_51N = 32651  # metric CRS for Zamboanga City, reused from compute_river_distances.py
