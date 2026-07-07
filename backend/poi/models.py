"""Map points-of-interest shared plumbing.

Holds the **unified POI audit log** (`MapPoiChange`) that records every operator
edit to a map POI — evacuation centers and flood hotspots alike — as an
append-only "when / where / what" trail. The concrete POI models live in their
own apps (`evacuation.EvacuationCenter`) or here (`FloodHotspot`), but they all
log through this single table so the console can show one activity feed.
"""

from django.conf import settings
from django.contrib.gis.db import models


class PoiType(models.TextChoices):
    EVACUATION = "evacuation", "Evacuation center"
    HOTSPOT = "hotspot", "Flood hotspot"


class HotspotSeverity(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"


class FloodHotspot(models.Model):
    """An operator-marked frequent-flooding area (a point with an advisory radius).

    ADVISORY ONLY: it's surfaced on the GIS + mobile map to warn residents that a
    spot floods often, but it is deliberately **not** an input to the risk-scoring
    engine — it never changes a barangay's computed hazard score. (That's why it
    lives here and not as a `risk_score` factor.)
    """

    name = models.CharField(max_length=255)
    location = models.PointField(srid=4326)
    radius_m = models.PositiveIntegerField(default=300, help_text="Advisory radius in metres.")
    severity = models.CharField(
        max_length=10, choices=HotspotSeverity.choices, default=HotspotSeverity.MEDIUM
    )
    description = models.TextField(blank=True, help_text="Why this area floods (e.g. clogged canal).")
    barangay = models.ForeignKey(
        "barangays.Barangay",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flood_hotspots",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.severity})"


class MapPoiChange(models.Model):
    """One audited edit to a map POI (create / update / move / delete)."""

    class Action(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        MOVED = "moved", "Moved"
        DELETED = "deleted", "Deleted"

    editor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    poi_type = models.CharField(max_length=12, choices=PoiType.choices, db_index=True)
    # Not an FK: the row must survive the POI being deleted (append-only history).
    poi_id = models.PositiveIntegerField()
    name = models.CharField(max_length=255, help_text="POI name at the time of the edit.")
    action = models.CharField(max_length=10, choices=Action.choices)
    # Where it was at the time (lng/lat), so the log answers "where" without the POI.
    longitude = models.FloatField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    # What changed: e.g. {"changed": {"capacity": [100, 150]}, "moved": true}.
    detail = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["poi_type", "-created_at"])]

    def __str__(self):
        return f"{self.action} {self.poi_type} #{self.poi_id} ({self.name})"
