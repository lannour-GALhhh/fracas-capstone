from django.contrib import admin

from .models import Barangay, Street


@admin.register(Barangay)
class BarangayAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "land_height_mean")
    list_filter = ("province_code",)
    search_fields = ("name", "code")


@admin.register(Street)
class StreetAdmin(admin.ModelAdmin):
    list_display = ("name", "barangay", "susceptibility_level")
    list_filter = ("susceptibility_level", "barangay")
    search_fields = ("name", "barangay__name")
