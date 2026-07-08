from django.contrib.gis.db import models

from .constants import SusceptibilityLevel

# Create your models here.
class Barangay(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    province_code = models.CharField(max_length=255)
    area_square_km = models.FloatField(null=True, blank=True)
    boundary = models.MultiPolygonField(srid=4326)

    land_height_mean = models.FloatField(blank=True, null=True)
    land_height_min = models.FloatField(blank=True, null=True)
    land_height_max = models.FloatField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['province_code', 'name'])
        ]
    
    def __str__(self):
        return self.name


class BarangaySusceptibility(models.Model):
    """One row per Barangay x SusceptibilityLevel intersection, derived from the
    authoritative ZCDRRMO/DOST/PAGASA (via Manila Observatory) flood-susceptibility
    shapefile. See `barangays/management/commands/load_flood_susceptibility.py`."""

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