from django.contrib.gis.db import models


class EvacuationCenter(models.Model):
    """A designated evacuation center. Shipped to the mobile app as GeoJSON so it
    can compute the nearest center to the resident client-side (no per-user geo
    work on the backend)."""

    name = models.CharField(max_length=255)
    location = models.PointField(srid=4326)
    # Which barangay it sits in (nullable — a center may be unmapped or just outside
    # a loaded boundary). Kept loose on purpose; the app resolves "nearest" by distance.
    barangay = models.ForeignKey(
        "barangays.Barangay",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evacuation_centers",
    )
    capacity = models.PositiveIntegerField(null=True, blank=True)
    contact = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
