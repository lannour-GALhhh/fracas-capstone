"""Dam water-level time series (one row per ingestion cycle)."""

from django.db import models

from .dam import Dam


class DamReading(models.Model):
    class Source(models.TextChoices):
        SCRAPER = "scraper", "Scraper"
        MANUAL = "manual", "Manual (operator)"

    dam = models.ForeignKey(Dam, on_delete=models.CASCADE, related_name="readings")

    water_level = models.FloatField(help_text="Metres.")
    turbidity = models.FloatField(null=True, blank=True, help_text="NTU (Lubog station).")
    rate_of_change = models.FloatField(
        null=True, blank=True, help_text="Metres per hour vs the previous reading."
    )
    is_spilling = models.BooleanField(default=False)
    source = models.CharField(
        max_length=10, choices=Source.choices, default=Source.SCRAPER,
        help_text="Where this reading came from (scraper, or manual operator entry).",
    )

    recorded_at = models.DateTimeField(db_index=True, help_text="Reading time reported by the source.")
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["dam", "-recorded_at"])]

    def __str__(self):
        return f"{self.dam} - {self.water_level}m @ {self.recorded_at}"
