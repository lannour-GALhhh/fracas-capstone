from django.conf import settings
from django.db import models

from barangays.models import Barangay


class Subscription(models.Model):
    """A user's interest in a barangay — who receives its notifications."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions"
    )
    barangay = models.ForeignKey(
        Barangay, on_delete=models.CASCADE, related_name="subscribers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "barangay")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} -> {self.barangay}"
