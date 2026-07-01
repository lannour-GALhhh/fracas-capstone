from django.contrib import admin

from .models import FloodEvent


@admin.register(FloodEvent)
class FloodEventAdmin(admin.ModelAdmin):
    list_display = ("barangay", "occurred_at", "severity", "water_depth_m", "source")
    list_filter = ("severity",)
    search_fields = ("barangay__name", "source")
    date_hierarchy = "occurred_at"
