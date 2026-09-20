"""In-app notification records — the user's notification feed."""

from django.conf import settings
from django.db import models

from barangays.models import Barangay
from risk_score.constants import RiskCategory


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    barangay = models.ForeignKey(
        Barangay, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    category = models.CharField(max_length=10, choices=RiskCategory.choices)
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.title} -> {self.user}"
