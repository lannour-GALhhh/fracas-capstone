from django.contrib.gis.admin import GISModelAdmin
from django.contrib import admin

from .models import EvacuationCenter


@admin.register(EvacuationCenter)
class EvacuationCenterAdmin(GISModelAdmin):
    list_display = ("name", "barangay", "capacity", "is_active")
    list_filter = ("is_active", "barangay")
    search_fields = ("name", "contact")
