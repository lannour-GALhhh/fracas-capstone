from django.contrib import admin

from .models import Barangay


@admin.register(Barangay)
class BarangayAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "land_height_mean")
    list_filter = ("province_code",)
    search_fields = ("name", "code")
