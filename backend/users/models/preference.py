from django.conf import settings
from django.db import models


class NotificationPreference(models.Model):
    """Per-user channel opt-ins and quiet hours."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preference"
    )
    sms_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    inapp_enabled = models.BooleanField(default=True)
    # Local-time window during which only in-app notifications are delivered (SMS/push held).
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)

    def __str__(self):
        return f"Preferences for {self.user}"
