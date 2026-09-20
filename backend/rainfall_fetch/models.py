from django.db import models
from barangays.models import Barangay


class Rainfall(models.Model):
    barangay = models.ForeignKey(Barangay,on_delete=models.CASCADE, related_name="rainfall_readings", null=True, blank=True)

    current_rainfall_strength = models.FloatField(default=0)

    # Forecast points every 15 min out to 4 hours (Open-Meteo minutely_15).
    forecast_strength_15min = models.FloatField(default=0)
    forecast_strength_30min = models.FloatField(default=0)
    forecast_strength_45min = models.FloatField(default=0)
    forecast_strength_60min = models.FloatField(default=0)
    forecast_strength_75min = models.FloatField(default=0)
    forecast_strength_90min = models.FloatField(default=0)
    forecast_strength_105min = models.FloatField(default=0)
    forecast_strength_120min = models.FloatField(default=0)
    forecast_strength_135min = models.FloatField(default=0)
    forecast_strength_150min = models.FloatField(default=0)
    forecast_strength_165min = models.FloatField(default=0)
    forecast_strength_180min = models.FloatField(default=0)
    forecast_strength_195min = models.FloatField(default=0)
    forecast_strength_210min = models.FloatField(default=0)
    forecast_strength_225min = models.FloatField(default=0)
    forecast_strength_240min = models.FloatField(default=0)

    # Accumulated rainfall (mm) over trailing windows ending at recorded_at.
    accumulated_6hr = models.FloatField(default=0)
    accumulated_12hr = models.FloatField(default=0)
    accumulated_24hr = models.FloatField(default=0)
    accumulated_7day = models.FloatField(default=0)

    rate_of_change = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    recorded_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['barangay', '-recorded_at'])
        ]

    def __str__(self):
        return f"{self.barangay} - recorded at: {self.recorded_at}"