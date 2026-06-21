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

    class Meta:
        indexes = [
            models.Index(fields=['province_code', 'name'])
        ]
    
    def __str__(self):
        return self.name