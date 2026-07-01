from django.contrib import admin

from .models import Dam, DamReading


@admin.register(Dam)
class DamAdmin(admin.ModelAdmin):
    list_display = ("name", "normal_level", "critical_level")


@admin.register(DamReading)
class DamReadingAdmin(admin.ModelAdmin):
    list_display = ("dam", "water_level", "rate_of_change", "is_spilling", "recorded_at")
    list_filter = ("is_spilling", "dam")
    readonly_fields = ("dam", "water_level", "turbidity", "rate_of_change", "is_spilling", "recorded_at", "fetched_at")
    date_hierarchy = "recorded_at"
