"""Recorded real-world flood events — the ground truth for model validation.

Also the data source for the flood-history UI. Populate from LGU/DRRMO
records, news reports, or PAGASA advisories via load_flood_events.
"""

from django.conf import settings
from django.db import models

from barangays.models import Barangay


class FloodSeverity(models.TextChoices):
    MINOR = "minor", "Minor"
    MODERATE = "moderate", "Moderate"
    MAJOR = "major", "Major"


class SourceKind(models.TextChoices):
    MANUAL = "manual", "Manual"
    AUTO = "auto", "Auto-detected"


class SourceType(models.TextChoices):
    """Who reported the event: a console operator or an external party."""

    OPERATOR = "operator", "Operator"
    THIRD_PARTY = "third_party", "3rd-party report"


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
    # Flood depth in feet (kept its historical column name to avoid a rename migration).
    water_depth_m = models.FloatField(null=True, blank=True, help_text="Peak flood depth in feet.")

    # --- operator-authored report fields (nullable so ground-truth rows stay valid) ---
    summary = models.TextField(blank=True, help_text="Narrative account of the event.")
    people_affected = models.PositiveIntegerField(null=True, blank=True)
    people_evacuated = models.PositiveIntegerField(null=True, blank=True)

    # --- origin + confirmation lifecycle ---
    # Auto-detected events are created unconfirmed by the pipeline and await LGU
    # confirmation; manually authored events are confirmed on creation.
    source_kind = models.CharField(
        max_length=10, choices=SourceKind.choices, default=SourceKind.MANUAL, db_index=True
    )
    is_confirmed = models.BooleanField(default=True, db_index=True)
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_flood_events",
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)

    # Soft delete: hidden immediately, hard-purged by a task after a grace window.
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # --- who reported it ---
    # OPERATOR → reported_by links the console user; THIRD_PARTY → `source` holds
    # the free-text attribution (e.g. news outlet, PAGASA advisory).
    source_type = models.CharField(
        max_length=12, choices=SourceType.choices, default=SourceType.THIRD_PARTY
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reported_flood_events",
    )
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

    @property
    def is_resolved(self) -> bool:
        return self.ended_at is not None

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class FloodEventChange(models.Model):
    """Append-only audit trail: who changed what on a flood event, and when."""

    class Action(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        CONFIRMED = "confirmed", "Confirmed"
        RESOLVED = "resolved", "Resolved"
        DELETED = "deleted", "Deleted"
        RESTORED = "restored", "Restored"

    flood_event = models.ForeignKey(
        FloodEvent, on_delete=models.CASCADE, related_name="changes"
    )
    editor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    action = models.CharField(max_length=10, choices=Action.choices, default=Action.UPDATED)
    # For UPDATED rows: which field, and its before/after (blank for whole-event actions).
    field = models.CharField(max_length=50, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-changed_at"]
        indexes = [models.Index(fields=["flood_event", "-changed_at"])]

    def __str__(self):
        return f"{self.action} {self.field} on event #{self.flood_event_id}"


class RiskThreshold(models.TextChoices):
    """Risk categories that can arm auto-detection (low is never a flood trigger)."""

    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class AutoDetectConfig(models.Model):
    """Singleton: whether the pipeline auto-drafts flood events, and at what risk.

    Configured from the standalone operator/admin console (not Django /admin).
    """

    enabled = models.BooleanField(default=True)
    threshold_category = models.CharField(
        max_length=10, choices=RiskThreshold.choices, default=RiskThreshold.HIGH
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        state = "on" if self.enabled else "off"
        return f"AutoDetect ({state} @ {self.threshold_category})"

    @classmethod
    def get_solo(cls) -> "AutoDetectConfig":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


def report_image_path(instance, filename):
    """Group evidence images per flood event in the storage bucket."""
    return f"flood_reports/{instance.report.flood_event_id}/{filename}"


class FloodEventReport(models.Model):
    """Operator-authored evidence report attached to a flood event.

    Captures a narrative, a capture time, the reporting user, and photos stored
    in the configured media bucket (local / S3 / Cloudinary — see settings). Used
    as supporting evidence for the historical record.
    """

    flood_event = models.ForeignKey(
        FloodEvent, on_delete=models.CASCADE, related_name="reports"
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flood_reports",
    )
    description = models.TextField(blank=True)
    occurred_at = models.DateTimeField(help_text="When the evidence was captured.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [models.Index(fields=["flood_event", "-occurred_at"])]

    def __str__(self):
        return f"Report on event #{self.flood_event_id} @ {self.occurred_at:%Y-%m-%d %H:%M}"


class FloodEventReportImage(models.Model):
    report = models.ForeignKey(
        FloodEventReport, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to=report_image_path)
    caption = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for report #{self.report_id}"


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
