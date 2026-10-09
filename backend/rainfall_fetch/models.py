from django.db import models

from audit.models import SingletonModel
from barangays.models import Barangay


class RainfallSettings(SingletonModel):
    """Admin-editable rainfall ingestion policy (cached singleton)."""

    class WeatherModel(models.TextChoices):
        DEFAULT = "default", "Open-Meteo default (best match)"
        ECMWF = "ecmwf_ifs025", "ECMWF IFS 0.25°"

    weather_model = models.CharField(
        max_length=30, choices=WeatherModel.choices, default=WeatherModel.DEFAULT,
        help_text="Which Open-Meteo weather model supplies rainfall data.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def model_param(self) -> str:
        """Open-Meteo `models=` query fragment ('' keeps Open-Meteo's own default)."""
        return "" if self.weather_model == self.WeatherModel.DEFAULT else f"&models={self.weather_model}"

    def __str__(self):
        return f"Rainfall settings ({self.weather_model})"


class BarangayRainfallGrid(models.Model):
    """Maps a barangay to the Open-Meteo weather grid-cell it actually resolves to.

    Discovered empirically (see `discover_rainfall_grid` management command) from
    the `latitude`/`longitude` Open-Meteo echoes back per location — never assumed
    from geographic distance. Barangays sharing a grid cell get byte-identical
    weather data, so `fetch_rainfall_information` queries once per unique cell
    (by `grid_lat`/`grid_lon`) instead of once per barangay.
    """

    barangay = models.OneToOneField(Barangay, on_delete=models.CASCADE, related_name="rainfall_grid")
    grid_lat = models.FloatField()
    grid_lon = models.FloatField()
    discovered_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["grid_lat", "grid_lon"])]

    def __str__(self):
        return f"{self.barangay} -> ({self.grid_lat}, {self.grid_lon})"


class HourlyRainfall(models.Model):
    """Our own per-barangay hourly record: the reading seen at the top of each hour.

    Source of the 6h/12h/24h/7d accumulations, so we don't re-download a week of
    history from Open-Meteo on every run. `hour` is always on the hour (10:00, 11:00...).
    """

    barangay = models.ForeignKey(Barangay, on_delete=models.CASCADE, related_name="hourly_rainfall")
    hour = models.DateTimeField()
    precipitation = models.FloatField(default=0)  # mm, as reported at `hour`

    class Meta:
        ordering = ["-hour"]
        constraints = [models.UniqueConstraint(fields=["barangay", "hour"], name="uniq_hourly_rainfall")]
        indexes = [models.Index(fields=["hour"])]

    def __str__(self):
        return f"{self.barangay} @ {self.hour:%Y-%m-%d %H:00}: {self.precipitation} mm"


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