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


class FloodEventWriteSerializer(serializers.ModelSerializer):
    """Operator create/update, with the response timeline written inline.

    Timeline uses replace-all semantics: the entries in the payload become the
    event's full timeline (simplest predictable behaviour for the form UI).
    """

    timeline = FloodEventTimelineEntrySerializer(many=True, required=False)

    class Meta:
        model = FloodEvent
        fields = [
            "id",
            "barangay",
            "occurred_at",
            "ended_at",
            "severity",
            "water_depth_m",
            "summary",
            "people_affected",
            "people_evacuated",
            "source",
            "notes",
            "timeline",
        ]

    def validate(self, attrs):
        occurred_at = attrs.get("occurred_at", getattr(self.instance, "occurred_at", None))
        ended_at = attrs.get("ended_at", getattr(self.instance, "ended_at", None))
        if occurred_at and ended_at and ended_at < occurred_at:
            raise serializers.ValidationError({"ended_at": "Must be at or after occurred_at."})
        return attrs

    def _write_timeline(self, event, entries):
        event.timeline.all().delete()
        FloodEventTimelineEntry.objects.bulk_create(
            [FloodEventTimelineEntry(flood_event=event, **entry) for entry in entries]
        )

    def create(self, validated_data):
        entries = validated_data.pop("timeline", [])
        event = FloodEvent.objects.create(**validated_data)
        self._write_timeline(event, entries)
        return event

    def update(self, instance, validated_data):
        entries = validated_data.pop("timeline", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if entries is not None:
            self._write_timeline(instance, entries)
        return instance
