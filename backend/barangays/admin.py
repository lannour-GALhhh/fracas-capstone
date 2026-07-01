from django.contrib import admin

from .models import Barangay


@admin.register(Barangay)
class BarangayAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_downstream", "land_height_mean", "flood_susceptibility")
    list_filter = ("is_downstream", "province_code")
    search_fields = ("name", "code")
    list_editable = ("is_downstream",)
