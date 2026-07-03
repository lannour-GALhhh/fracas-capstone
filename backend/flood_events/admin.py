from django.contrib import admin

from .models import FloodEvent, FloodEventTimelineEntry


class FloodEventTimelineInline(admin.TabularInline):
    model = FloodEventTimelineEntry
    extra = 1
    ordering = ("occurred_at",)


@admin.register(FloodEvent)
class FloodEventAdmin(admin.ModelAdmin):
    list_display = (
        "barangay",
        "occurred_at",
        "ended_at",
        "severity",
        "water_depth_m",
        "people_affected",
        "people_evacuated",
        "source",
    )
    list_filter = ("severity",)
    search_fields = ("barangay__name", "source")
    date_hierarchy = "occurred_at"
    inlines = [FloodEventTimelineInline]
