from django.db import models
from barangays.models import Barangay

# Create your models here.
class Rainfall(models.Model):
    barangay = models.ForeignKey(Barangay,on_delete=models.CASCADE, related_name="rainfall_readings", null=True, blank=True)

    current_rainfall_strength = models.FloatField(default=0)
    forecast_strength_1hr = models.FloatField(default=0)
    forecast_strength_2hr = models.FloatField(default=0)
    forecast_strength_3hr = models.FloatField(default=0)
    forecast_strength_4hr = models.FloatField(default=0)

    rate_of_change = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    recorded_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['barangay', '-recorded_at'])
        ]

    def __str__(self):
        return f"{self.barangay} - recorded at: {self.recorded_at}"