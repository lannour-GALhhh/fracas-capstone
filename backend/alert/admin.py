from django.contrib import admin

from .models import AlertState, Notification, NotificationLog


@admin.register(AlertState)
class AlertStateAdmin(admin.ModelAdmin):
    list_display = ("barangay", "level", "is_suppressed", "entered_at", "last_notified_at")
    list_filter = ("level", "is_suppressed")
    list_editable = ("is_suppressed",)  # operator suppression override


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "category", "is_read", "created_at")
    list_filter = ("category", "is_read")


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ("channel", "user", "status", "created_at")
    list_filter = ("channel", "status")
