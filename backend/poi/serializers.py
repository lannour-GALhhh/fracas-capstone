from django.contrib.gis.geos import Point
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from barangays.models import Barangay

from .models import FloodHotspot, MapPoiChange


class MapPoiChangeSerializer(serializers.ModelSerializer):
    editor_name = serializers.CharField(source="editor.get_full_name", read_only=True)
    editor_username = serializers.CharField(source="editor.username", read_only=True)

    class Meta:
        model = MapPoiChange
        fields = [
            "id",
            "poi_type",
            "poi_id",
            "name",
            "action",
            "longitude",
            "latitude",
            "detail",
            "editor",
            "editor_name",
            "editor_username",
            "created_at",
        ]


class FloodHotspotSerializer(GeoFeatureModelSerializer):
    """GeoJSON read representation (GIS console + mobile advisory overlay)."""

    barangay_name = serializers.SerializerMethodField()

    def get_barangay_name(self, obj):
        return obj.barangay.name if obj.barangay_id else None

    class Meta:
        model = FloodHotspot
        geo_field = "location"
        id_field = False
        fields = [
            "id",
            "name",
            "radius_m",
            "severity",
            "description",
            "is_active",
            "barangay",
            "barangay_name",
        ]


class FloodHotspotWriteSerializer(serializers.ModelSerializer):
    """Operator write form: flat lat/lng in, GeoJSON Feature back out."""

    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = FloodHotspot
        fields = [
            "id",
            "name",
            "radius_m",
            "severity",
            "description",
            "is_active",
            "barangay",
            "latitude",
            "longitude",
        ]

    def _apply_location(self, validated):
        lat = validated.pop("latitude", None)
        lng = validated.pop("longitude", None)
        point = Point(lng, lat, srid=4326) if lat is not None and lng is not None else None
        if point is not None:
            validated["location"] = point
            if not validated.get("barangay"):
                validated["barangay"] = Barangay.objects.filter(boundary__contains=point).first()
        return validated

    def create(self, validated_data):
        return super().create(self._apply_location(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._apply_location(validated_data))

    def to_representation(self, instance):
        return FloodHotspotSerializer(instance, context=self.context).data
