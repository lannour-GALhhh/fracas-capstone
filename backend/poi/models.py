"""Map points-of-interest shared plumbing.

Holds the **unified POI audit log** (`MapPoiChange`) that records every operator
edit to a map POI as an append-only "when / where / what" trail. The concrete
POI model lives in its own app (`evacuation.EvacuationCenter`), but logs
through this single table so the console can show one activity feed.
"""

from django.conf import settings
from django.contrib.gis.db import models


class PoiType(models.TextChoices):
    EVACUATION = "evacuation", "Evacuation center"
    # Flood hotspots were removed (superseded by the authoritative
    # BarangaySusceptibility hazard-zone layer); kept here so old audit rows
    # (MapPoiChange.poi_type="hotspot") remain a valid choice for display.
    HOTSPOT = "hotspot", "Flood hotspot"


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
