from django.db import models


class SusceptibilityLevel(models.TextChoices):
    VERY_LOW = "very_low", "Very Low"
    LOW = "low", "Low"
    MODERATE = "moderate", "Moderate"
    HIGH = "high", "High"
    VERY_HIGH = "very_high", "Very High"


# Even 0-1 mapping, keyed by the shapefile's categorical `susc_level` label (not
# its numeric `Flood` field, kept only as `source_flood_value` for traceability —
# deriving from the numeric field would silently break if authorities re-code it).
SUSCEPTIBILITY_VALUES = {
    SusceptibilityLevel.VERY_LOW: 0.2,
    SusceptibilityLevel.LOW: 0.4,
    SusceptibilityLevel.MODERATE: 0.6,
    SusceptibilityLevel.HIGH: 0.8,
    SusceptibilityLevel.VERY_HIGH: 1.0,
}

UTM_51N = 32651  # metric CRS for Zamboanga City, reused from compute_river_distances.py
