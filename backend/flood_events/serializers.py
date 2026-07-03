from rest_framework import serializers

from .models import FloodEvent, FloodEventTimelineEntry
from .services.telemetry import build_event_telemetry


class FloodEventSerializer(serializers.ModelSerializer):
    """Lean shape for the paginated list (no telemetry joins)."""

    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = FloodEvent
        fields = [
            "id",
            "barangay",
            "barangay_name",
            "occurred_at",
            "severity",
            "water_depth_m",
            "source",
            "notes",
        ]


class FloodEventTimelineEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FloodEventTimelineEntry
        fields = ["id", "occurred_at", "title", "description"]


class FloodEventDetailSerializer(serializers.ModelSerializer):
    """Full report: stored operator fields + response timeline + derived telemetry."""

    barangay_name = serializers.CharField(source="barangay.name", read_only=True)
    duration_hours = serializers.FloatField(read_only=True)
    timeline = FloodEventTimelineEntrySerializer(many=True, read_only=True)
    telemetry = serializers.SerializerMethodField()

    class Meta:
        model = FloodEvent
        fields = [
            "id",
            "barangay",
            "barangay_name",
            "occurred_at",
            "ended_at",
            "duration_hours",
            "severity",
            "water_depth_m",
            "summary",
            "people_affected",
            "people_evacuated",
            "source",
            "notes",
            "timeline",
            "telemetry",
        ]

    def get_telemetry(self, event) -> dict:
        return build_event_telemetry(event)
