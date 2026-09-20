from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Device, NotificationPreference, Subscription, User

contact = ("Contact & notifications", {"fields": ("phone_number", "phone_verified")})
console_role = (
    "Console role",
    {
        "fields": ("is_operator",),
        "description": (
            "Operators run the DRRMO web console (broadcasts, monitoring) but are "
            "kept out of this admin site. Admin-site access is the "
            "&ldquo;Staff status&rdquo; flag under Permissions above."
        ),
    },
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (console_role, contact)
    list_display = (
        "username",
        "email",
        "phone_number",
        "phone_verified",
        "is_operator",
        "is_staff",
    )
    list_filter = UserAdmin.list_filter + ("is_operator",)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "barangay", "created_at")
    search_fields = ("user__username", "barangay__name")


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "is_active", "created_at")
    list_filter = ("platform", "is_active")


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "sms_enabled", "push_enabled", "inapp_enabled")
