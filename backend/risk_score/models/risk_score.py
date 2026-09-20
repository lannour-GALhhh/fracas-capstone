"""Per-barangay hazard result for one computation cycle."""

from django.db import models

from barangays.models import Barangay
from risk_score.constants import RiskCategory


class RiskScore(models.Model):
    barangay = models.ForeignKey(
        Barangay, on_delete=models.CASCADE, related_name="risk_scores"
    )
    score = models.FloatField()
    category = models.CharField(max_length=10, choices=RiskCategory.choices)

    # Per-factor contributions for explainability ("why is this barangay at risk").
    breakdown = models.JSONField(default=dict)
    # True when a factor's input was stale/missing and its weight was redistributed.
    is_degraded = models.BooleanField(default=False)

    config = models.ForeignKey(
        "risk_score.RiskConfig",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scores",
    )
    computed_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ["-computed_at"]
        indexes = [models.Index(fields=["barangay", "-computed_at"])]

    def __str__(self):
        return f"{self.barangay} - {self.category} ({self.score:.1f})"
