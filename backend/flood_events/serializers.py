from rest_framework import serializers

from .models import (
    AutoDetectConfig,
    FloodEvent,
    FloodEventChange,
    FloodEventTimelineEntry,
    SourceType,
)
from .services import changes
from .services.telemetry import build_event_telemetry


def display_name(user) -> str | None:
    """Friendly name for audit/confirmation display."""
    if user is None:
        return None
    return user.get_full_name() or user.get_username()


class FloodEventSerializer(serializers.ModelSerializer):
    """Lean shape for the paginated list (no telemetry joins)."""

    barangay_name = serializers.CharField(source="barangay.name", read_only=True)
    confirmed_by_name = serializers.SerializerMethodField()
    reported_by_name = serializers.SerializerMethodField()
    is_resolved = serializers.BooleanField(read_only=True)

    class Meta:
        model = FloodEvent
        fields = [
            "id",
            "barangay",
            "barangay_name",
            "occurred_at",
            "ended_at",
            "severity",
            "water_depth_m",
            "source",
            "source_type",
            "reported_by_name",
            "notes",
            "source_kind",
            "is_confirmed",
            "confirmed_by_name",
            "is_resolved",
        ]

    def get_confirmed_by_name(self, event) -> str | None:
        return display_name(event.confirmed_by)

    def get_reported_by_name(self, event) -> str | None:
        return display_name(event.reported_by)


class FloodEventTimelineEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FloodEventTimelineEntry
        fields = ["id", "occurred_at", "title", "description"]


class FloodEventChangeSerializer(serializers.ModelSerializer):
    editor_name = serializers.SerializerMethodField()

    class Meta:
        model = FloodEventChange
        fields = [
            "id",
            "editor_name",
            "action",
            "field",
            "old_value",
            "new_value",
            "changed_at",
        ]

    def get_editor_name(self, change) -> str | None:
        return display_name(change.editor)


class MyFloodActivitySerializer(serializers.ModelSerializer):
    """One flood-event action by the signed-in operator, for the account feed.

    Unlike the per-event `FloodEventChangeSerializer`, this carries the target
    event's id and barangay name so a row reads standalone (e.g. "Confirmed
    Rio Hondo").
    """

    barangay_name = serializers.CharField(source="flood_event.barangay.name", read_only=True)

    class Meta:
        model = FloodEventChange
        fields = ["id", "flood_event", "barangay_name", "action", "changed_at"]
        read_only_fields = fields


class FloodEventDetailSerializer(serializers.ModelSerializer):
    """Full report: stored operator fields + response timeline + derived telemetry."""

    barangay_name = serializers.CharField(source="barangay.name", read_only=True)
    duration_hours = serializers.FloatField(read_only=True)
    is_resolved = serializers.BooleanField(read_only=True)
    confirmed_by_name = serializers.SerializerMethodField()
    reported_by_name = serializers.SerializerMethodField()
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
            "is_resolved",
            "severity",
            "water_depth_m",
            "summary",
            "people_affected",
            "people_evacuated",
            "source",
            "source_type",
            "reported_by",
            "reported_by_name",
            "notes",
            "source_kind",
            "is_confirmed",
            "confirmed_by_name",
            "confirmed_at",
            "deleted_at",
            "timeline",
            "telemetry",
        ]

    def get_confirmed_by_name(self, event) -> str | None:
        return display_name(event.confirmed_by)

    def get_reported_by_name(self, event) -> str | None:
        return display_name(event.reported_by)

    def get_telemetry(self, event) -> dict:
        return build_event_telemetry(event)


class FloodEventWriteSerializer(serializers.ModelSerializer):
    """Operator create/update, with the response timeline written inline.

    Timeline uses replace-all semantics: the entries in the payload become the
    event's full timeline (simplest predictable behaviour for the form UI).
    Scalar edits are recorded to the FloodEventChange audit trail.
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
            "source_type",
            "reported_by",
            "notes",
            "timeline",
        ]

    def validate(self, attrs):
        occurred_at = attrs.get("occurred_at", getattr(self.instance, "occurred_at", None))
        ended_at = attrs.get("ended_at", getattr(self.instance, "ended_at", None))
        if occurred_at and ended_at and ended_at < occurred_at:
            raise serializers.ValidationError({"ended_at": "Must be at or after occurred_at."})

        source_type = attrs.get("source_type", getattr(self.instance, "source_type", None))
        if source_type == SourceType.OPERATOR:
            reported_by = attrs.get("reported_by", getattr(self.instance, "reported_by", None))
            if reported_by is None:
                raise serializers.ValidationError(
                    {"reported_by": "Select the reporting operator."}
                )
        return attrs

    @property
    def _editor(self):
        request = self.context.get("request")
        return getattr(request, "user", None) if request else None

    def _write_timeline(self, event, entries):
        event.timeline.all().delete()
        FloodEventTimelineEntry.objects.bulk_create(
            [FloodEventTimelineEntry(flood_event=event, **entry) for entry in entries]
        )

    def create(self, validated_data):
        entries = validated_data.pop("timeline", [])
        event = FloodEvent.objects.create(**validated_data)
        self._write_timeline(event, entries)
        changes.log_action(event, FloodEventChange.Action.CREATED, self._editor)
        return event

    def update(self, instance, validated_data):
        entries = validated_data.pop("timeline", None)
        before = changes.capture(instance)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        changes.record_update(instance, before, self._editor)
        if entries is not None:
            self._write_timeline(instance, entries)
        return instance


class AutoDetectConfigSerializer(serializers.ModelSerializer):
    """Admin-tunable auto-detection settings (singleton)."""

    class Meta:
        model = AutoDetectConfig
        fields = ["enabled", "threshold_category", "updated_at"]
        read_only_fields = ["updated_at"]
