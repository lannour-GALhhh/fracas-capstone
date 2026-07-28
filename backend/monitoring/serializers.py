from rest_framework import serializers

from audit.serializers import SingletonSerializer

from .models import OperationalToggles, OrganizationSettings, RetentionPolicy


class RetentionPolicySerializer(SingletonSerializer):
    class Meta:
        model = RetentionPolicy
        fields = [
            "rainfall_retention_days",
            "risk_score_retention_days",
            "evacuation_status_retention_days",
            "flood_event_purge_grace_hours",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class OperationalTogglesSerializer(SingletonSerializer):
    class Meta:
        model = OperationalToggles
        fields = ["maintenance_mode", "announcement_banner", "broadcast_enabled", "updated_at"]
        read_only_fields = ["updated_at"]


class OrganizationSettingsSerializer(SingletonSerializer):
    class Meta:
        model = OrganizationSettings
        fields = ["org_name", "system_title", "contact_number", "alert_footer", "updated_at"]
        read_only_fields = ["updated_at"]


class PublicConfigSerializer(serializers.Serializer):
    """Read-only branding + banner surfaced to every client (no auth).

    One source of truth for the console header and the system-wide announcement
    banner, so web and mobile render the same org identity.
    """

    def to_representation(self, instance):
        org = OrganizationSettings.cached()
        toggles = OperationalToggles.cached()
        return {
            "org_name": org.org_name,
            "system_title": org.system_title,
            "contact_number": org.contact_number,
            "maintenance_mode": toggles.maintenance_mode,
            "announcement_banner": toggles.announcement_banner,
        }
