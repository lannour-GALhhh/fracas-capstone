"""A recorded run of the hindcast validation harness."""

from django.conf import settings
from django.db import models


class ValidationRun(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    events_evaluated = models.IntegerField(default=0)
    hits = models.IntegerField(default=0)
    recall = models.FloatField(null=True, blank=True)
    mean_score = models.FloatField(null=True, blank=True)
    details = models.JSONField(default=list)
    error = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ValidationRun #{self.pk} ({self.status})"
