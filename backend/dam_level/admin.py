from django.contrib import admin

from .models import Dam, DamReading
from .services.reading import rate_of_change


@admin.register(Dam)
class DamAdmin(admin.ModelAdmin):
    list_display = ("name", "normal_level", "critical_level")


@admin.register(DamReading)
class DamReadingAdmin(admin.ModelAdmin):
    """Read-only for scraped readings; the add form is the operator's manual
    dam-level entry fallback for when the scraper is down. Derived fields
    (rate-of-rise, spilling, source) are computed on save, not typed in."""

    list_display = ("dam", "water_level", "rate_of_change", "is_spilling", "source", "recorded_at")
    list_filter = ("is_spilling", "source", "dam")
    date_hierarchy = "recorded_at"

    # Operators type these when adding a manual reading.
    _manual_fields = ("dam", "water_level", "turbidity", "recorded_at")
    _derived_fields = ("rate_of_change", "is_spilling", "source", "fetched_at")

    def get_readonly_fields(self, request, obj=None):
        if obj is None:  # add form → allow manual entry
            return self._derived_fields
        return self._manual_fields + self._derived_fields  # existing rows immutable

    def save_model(self, request, obj, form, change):
        if not change:  # manual operator entry
            previous = obj.dam.readings.first()
            obj.rate_of_change = rate_of_change(previous, obj.water_level, obj.recorded_at)
            obj.is_spilling = obj.water_level > obj.dam.normal_level
            obj.source = DamReading.Source.MANUAL
        super().save_model(request, obj, form, change)
