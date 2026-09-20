"""Per-source ingestion health: one row per data source."""

from django.db import models


class IngestionHealth(models.Model):
    class Status(models.TextChoices):
        OK = "ok", "OK"
        FAILED = "failed", "Failed"

    source = models.CharField(max_length=32, unique=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.OK
    )
    last_error = models.TextField(blank=True, default="")
    consecutive_failures = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["source"]

    def __str__(self):
        return f"{self.source}: {self.last_status}"
