from django.contrib.gis.db import models

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

    # --- static flood-vulnerability profile ---
    # Downstream of the Pasonanca diversion dam (Tumaga corridor): these
    # barangays weight the dam factor heavily. Set via the flag_downstream cmd.
    is_downstream = models.BooleanField(default=False, db_index=True)
    # 0-1 flood susceptibility from a hazard map (Project NOAH / HazardHunterPH).
    flood_susceptibility = models.FloatField(null=True, blank=True)
    distance_to_river_km = models.FloatField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['province_code', 'name'])
        ]
    
    def __str__(self):
        return self.name