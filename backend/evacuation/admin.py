from django.contrib.gis.admin import GISModelAdmin
from django.contrib import admin

from .models import EvacuationCenter, EvacuationCenterContact, EvacuationCenterImage


class ContactInline(admin.TabularInline):
    model = EvacuationCenterContact
    extra = 0


class ImageInline(admin.TabularInline):
    model = EvacuationCenterImage
    extra = 0


@admin.register(EvacuationCenter)
class EvacuationCenterAdmin(GISModelAdmin):
    list_display = ("name", "barangay", "capacity", "is_active")
    list_filter = ("is_active", "barangay")
    search_fields = ("name", "contacts__phone")
    inlines = (ContactInline, ImageInline)
