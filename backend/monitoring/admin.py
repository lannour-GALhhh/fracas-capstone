from django.contrib import admin

from .models import IngestionHealth


@admin.register(IngestionHealth)
class IngestionHealthAdmin(admin.ModelAdmin):
    list_display = (
        "source",
        "last_status",
        "last_success_at",
        "consecutive_failures",
        "updated_at",
    )
    list_filter = ("last_status",)
    readonly_fields = (
        "source",
        "last_run_at",
        "last_success_at",
        "last_status",
        "last_error",
        "consecutive_failures",
        "updated_at",
    )
