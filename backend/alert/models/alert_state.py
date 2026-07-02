"""Per-barangay alert state — the memory behind alert hysteresis.

Tracks the current alert level so we notify on *transitions into* critical
(not every 15-min cycle) and can re-notify only after a cooldown.
"""

from django.db import models

from barangays.models import Barangay
from risk_score.constants import RiskCategory


class AlertState(models.Model):
    barangay = models.OneToOneField(
        Barangay, on_delete=models.CASCADE, related_name="alert_state"
    )
    level = models.CharField(
        max_length=10, choices=RiskCategory.choices, default=RiskCategory.LOW
    )
    entered_at = models.DateTimeField(auto_now_add=True)
    last_notified_at = models.DateTimeField(null=True, blank=True)
    is_suppressed = models.BooleanField(
        default=False,
        help_text="Operator override: mute automated alerts for this barangay "
        "(e.g. a known false positive). State still tracks the level.",
    )

    def __str__(self):
        return f"{self.barangay}: {self.level}"
