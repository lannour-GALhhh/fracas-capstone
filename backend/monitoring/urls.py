from django.urls import path

from .settings_views import (
    OperationalTogglesView,
    OrganizationSettingsView,
    PublicConfigView,
    RetentionPolicyView,
)
from .cron_views import CronJobView
from .system_views import PipelineRunView, RetentionRunView, SystemStatusView
from .views import LivenessView, ReadinessView, StatusView

urlpatterns = [
    path("health/", LivenessView.as_view()),
    path("health/ready/", ReadinessView.as_view()),
    path("health/status/", StatusView.as_view()),

    # External cron triggers (secret-protected; see CRON_SECRET).
    path("cron/<slug:job>/", CronJobView.as_view(), name="cron-job"),

    # Public branding + announcement banner (no auth).
    path("config/", PublicConfigView.as_view(), name="public-config"),

    # Admin system ops (E).
    path("admin/system/status/", SystemStatusView.as_view(), name="admin-system-status"),
    path("admin/system/pipeline/run/", PipelineRunView.as_view(), name="admin-pipeline-run"),
    path("admin/system/retention/run/", RetentionRunView.as_view(), name="admin-retention-run"),

    # Admin settings owned by monitoring (H).
    path("admin/settings/retention/", RetentionPolicyView.as_view(), name="admin-settings-retention"),
    path("admin/settings/toggles/", OperationalTogglesView.as_view(), name="admin-settings-toggles"),
    path("admin/settings/organization/", OrganizationSettingsView.as_view(), name="admin-settings-organization"),
]
