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
    # Optional recession time; with occurred_at it yields the event duration.
    ended_at = models.DateTimeField(
        null=True, blank=True, help_text="When flooding receded / event was closed."
    )
    severity = models.CharField(
        max_length=10, choices=FloodSeverity.choices, default=FloodSeverity.MODERATE
    )
    water_depth_m = models.FloatField(null=True, blank=True)

    # --- operator-authored report fields (nullable so ground-truth rows stay valid) ---
    summary = models.TextField(blank=True, help_text="Narrative account of the event.")
    people_affected = models.PositiveIntegerField(null=True, blank=True)
    people_evacuated = models.PositiveIntegerField(null=True, blank=True)

    source = models.CharField(max_length=255, blank=True, help_text="e.g. DRRMO report, news, PAGASA.")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [models.Index(fields=["barangay", "-occurred_at"])]

    def __str__(self):
        return f"{self.barangay} flood ({self.severity}) @ {self.occurred_at:%Y-%m-%d}"

    @property
    def duration_hours(self) -> float | None:
        """Event length in hours, when a recession time is recorded."""
        if self.ended_at is None:
            return None
        return (self.ended_at - self.occurred_at).total_seconds() / 3600.0


class FloodEventTimelineEntry(models.Model):
    """One dated step in an event's response timeline (alert → dispatch → all-clear)."""

    flood_event = models.ForeignKey(
        FloodEvent, on_delete=models.CASCADE, related_name="timeline"
    )
    occurred_at = models.DateTimeField(help_text="When this step happened.")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["occurred_at"]
        indexes = [models.Index(fields=["flood_event", "occurred_at"])]

    def __str__(self):
        return f"{self.title} @ {self.occurred_at:%Y-%m-%d %H:%M}"
