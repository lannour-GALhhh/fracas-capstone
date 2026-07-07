from django.contrib.gis.geos import Point
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from barangays.models import Barangay

from .models import EvacuationCenter


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
