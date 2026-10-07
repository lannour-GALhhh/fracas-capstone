from django.conf import settings
from django.contrib.gis.db import models

from .constants import SusceptibilityLevel


class Barangay(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    province_code = models.CharField(max_length=255)
    area_square_km = models.FloatField(null=True, blank=True)
    boundary = models.MultiPolygonField(srid=4326)

    class Meta:
        indexes = [
            models.Index(fields=['province_code', 'name'])
        ]
    
    def __str__(self):
        return self.name


class BarangaySusceptibility(models.Model):
    """One row per Barangay x SusceptibilityLevel intersection."""

    barangay = models.ForeignKey(Barangay, on_delete=models.CASCADE, related_name="susceptibility_zones")
    level = models.CharField(max_length=12, choices=SusceptibilityLevel.choices, db_index=True)
    geom = models.MultiPolygonField(srid=4326)            # full precision, authoritative
    geom_simplified = models.MultiPolygonField(srid=4326) # topology-preserving simplify, for MapLibre
    area_sqm = models.FloatField()
    source_flood_value = models.FloatField()
    loaded_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["barangay", "level"])]
        constraints = [
            models.UniqueConstraint(fields=["barangay", "level"], name="uniq_barangay_susceptibility_level")
        ]

    def __str__(self):
        return f"{self.barangay.name} — {self.get_level_display()}"


class Street(models.Model):
    """A named street in a high/very_high susceptibility barangay, from OpenStreetMap."""

    name = models.CharField(max_length=255)
    barangay = models.ForeignKey(Barangay, on_delete=models.CASCADE, related_name="streets")
    susceptibility_level = models.CharField(max_length=12, choices=SusceptibilityLevel.choices, db_index=True)
    loaded_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["barangay", "susceptibility_level"])]
        constraints = [
            models.UniqueConstraint(fields=["barangay", "name"], name="uniq_barangay_street_name")
        ]
        ordering = ["barangay__name", "name"]

    def __str__(self):
        return f"{self.name} ({self.barangay.name})"


class GisImport(models.Model):
    """One admin-uploaded GIS layer and the outcome of processing it."""

    class Kind(models.TextChoices):
        BOUNDARY = "boundary", "Barangay boundaries"
        SUSCEPTIBILITY = "susceptibility", "Flood susceptibility"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    kind = models.CharField(max_length=16, choices=Kind.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    filename = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    result = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_kind_display()} import #{self.pk} ({self.status})"
