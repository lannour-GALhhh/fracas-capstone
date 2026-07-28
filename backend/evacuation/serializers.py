from django.contrib.gis.geos import Point
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from barangays.models import Barangay

from .models import EvacuationCenter, EvacuationStatus


class EvacuationCenterSerializer(GeoFeatureModelSerializer):
    """GeoJSON read representation (also what the mobile app downloads)."""

    # Method field (not source="barangay.name") so a null barangay serializes as
    # None instead of raising SkipField inside rest_framework_gis' get_properties.
    barangay_name = serializers.SerializerMethodField()

    def get_barangay_name(self, obj):
        return obj.barangay.name if obj.barangay_id else None

    class Meta:
        model = EvacuationCenter
        geo_field = "location"
        # Keep `id` in properties (see BarangayListSerializer for the rationale).
        id_field = False
        fields = ["id", "name", "capacity", "contact", "is_active", "barangay", "barangay_name"]


class EvacuationCenterWriteSerializer(serializers.ModelSerializer):
    """Operator write form: plain lat/lng in, GeoJSON Feature back out.

    Accepting flat coordinates keeps the in-map editor simple; the barangay is
    resolved by point-in-polygon when the operator doesn't set it explicitly.
    """

    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = EvacuationCenter
        fields = ["id", "name", "capacity", "contact", "is_active", "barangay", "latitude", "longitude"]

    def _apply_location(self, validated):
        lat = validated.pop("latitude", None)
        lng = validated.pop("longitude", None)
        point = Point(lng, lat, srid=4326) if lat is not None and lng is not None else None
        if point is not None:
            validated["location"] = point
            # Auto-resolve the containing barangay unless one was supplied.
            if not validated.get("barangay"):
                validated["barangay"] = Barangay.objects.filter(boundary__contains=point).first()
        return validated

    def create(self, validated_data):
        return super().create(self._apply_location(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._apply_location(validated_data))

    def to_representation(self, instance):
        return EvacuationCenterSerializer(instance, context=self.context).data


class EvacuationReportSerializer(serializers.Serializer):
    """Validates one device's status transition report.

    The device targets the active evacuation either by id or by its barangay;
    everything else describes the resident's own computed status.
    """

    evacuation_id = serializers.IntegerField(required=False)
    barangay_id = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(choices=EvacuationStatus.Status.choices)
    resolved_via = serializers.ChoiceField(
        choices=EvacuationStatus.ResolvedVia.choices, required=False, allow_blank=True
    )
    center_id = serializers.IntegerField(required=False, allow_null=True)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get("evacuation_id") and not attrs.get("barangay_id"):
            raise serializers.ValidationError(
                "Provide evacuation_id or barangay_id."
            )
        return attrs


class EvacuationStatusSerializer(serializers.ModelSerializer):
    """Per-resident drill-down row for the operator console."""

    user = serializers.SerializerMethodField()
    center_name = serializers.SerializerMethodField()

    class Meta:
        model = EvacuationStatus
        fields = [
            "id", "user", "status", "resolved_via",
            "center", "center_name", "last_lat", "last_lng", "updated_at",
        ]

    def get_user(self, obj):
        u = obj.user
        label = u.get_full_name() or getattr(u, "email", "") or str(u.pk)
        return {"id": u.pk, "label": label}

    def get_center_name(self, obj):
        return obj.center.name if obj.center_id else None


class PingEvacuationSerializer(serializers.Serializer):
    """Operator ping input — the barangay to open an evacuation for."""

    barangay_id = serializers.IntegerField()
