"""Recorded real-world flood events — the ground truth for model validation.

Also the data source for the flood-history UI. Populate from LGU/DRRMO
records, news reports, or PAGASA advisories via load_flood_events.
"""

from django.db import models

from barangays.models import Barangay


class FloodSeverity(models.TextChoices):
    MINOR = "minor", "Minor"
    MODERATE = "moderate", "Moderate"
    MAJOR = "major", "Major"


class FloodEvent(models.Model):
    barangay = models.ForeignKey(
        Barangay, on_delete=models.CASCADE, related_name="flood_events"
    )
    occurred_at = models.DateTimeField(db_index=True, help_text="When flooding occurred (local time).")
    severity = models.CharField(
        max_length=10, choices=FloodSeverity.choices, default=FloodSeverity.MODERATE
    )
    water_depth_m = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=255, blank=True, help_text="e.g. DRRMO report, news, PAGASA.")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [models.Index(fields=["barangay", "-occurred_at"])]

    def __str__(self):
        return f"{self.barangay} flood ({self.severity}) @ {self.occurred_at:%Y-%m-%d}"
