"""Admin-editable operational settings, as cached DB singletons.

Each mirrors the `AutoDetectConfig.get_solo()` pattern via `SingletonModel`, lives
here because monitoring owns (or is a neutral home for) the consumers, and defaults
to today's hardcoded value so behavior is unchanged until an admin edits it.
"""

from django.core.exceptions import ValidationError
from django.db import models

from audit.models import SingletonModel

from ..constants import (
    EVACUATION_STATUS_RETENTION_DAYS,
    RAINFALL_RETENTION_DAYS,
    RISK_SCORE_RETENTION_DAYS,
)

# Today's soft-delete purge window (mirrors flood_events.tasks.PURGE_AFTER_HOURS).
DEFAULT_PURGE_GRACE_HOURS = 6


class RetentionPolicy(SingletonModel):
    """Retention windows for the daily cleanup + flood-event purge tasks."""

    rainfall_retention_days = models.PositiveIntegerField(default=RAINFALL_RETENTION_DAYS)
    risk_score_retention_days = models.PositiveIntegerField(default=RISK_SCORE_RETENTION_DAYS)
    evacuation_status_retention_days = models.PositiveIntegerField(
        default=EVACUATION_STATUS_RETENTION_DAYS
    )
    flood_event_purge_grace_hours = models.PositiveIntegerField(default=DEFAULT_PURGE_GRACE_HOURS)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # A window shorter than one pipeline/day cycle would prune fresh rows.
        if self.rainfall_retention_days < 1:
            raise ValidationError({"rainfall_retention_days": "Must be at least 1 day."})
        if self.risk_score_retention_days < 1:
            raise ValidationError({"risk_score_retention_days": "Must be at least 1 day."})
        if self.evacuation_status_retention_days < 1:
            raise ValidationError(
                {"evacuation_status_retention_days": "Must be at least 1 day."}
            )
        if self.flood_event_purge_grace_hours < 1:
            raise ValidationError({"flood_event_purge_grace_hours": "Must be at least 1 hour."})

    def __str__(self):
        return "Retention policy"


class OperationalToggles(SingletonModel):
    """System-wide switches and the console announcement banner."""

    maintenance_mode = models.BooleanField(
        default=False, help_text="Show a maintenance banner; a soft signal to clients."
    )
    announcement_banner = models.CharField(
        max_length=280, blank=True, help_text="System-wide banner text shown in the console."
    )
    broadcast_enabled = models.BooleanField(
        default=True, help_text="Kill-switch for operator broadcasts."
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Operational toggles"


class OrganizationSettings(SingletonModel):
    """Branding + contact info shown in the console and appended to alerts."""

    org_name = models.CharField(max_length=120, default="FRACAS")
    system_title = models.CharField(max_length=120, default="FRACAS Console")
    contact_number = models.CharField(max_length=40, blank=True)
    alert_footer = models.CharField(
        max_length=160, blank=True,
        help_text="Signature appended to alert/broadcast messages (e.g. — Zamboanga City DRRMO).",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.org_name
