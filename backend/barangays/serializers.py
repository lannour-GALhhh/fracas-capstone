from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework_gis.fields import GeometryField
from .models import (
    Barangay,
    BarangaySusceptibility,
    Street,
)

# Halves GeoJSON payload size at zero visible cost.
GEOJSON_PRECISION = 6

class BarangayListSerializer(GeoFeatureModelSerializer):
    subscriber_count = serializers.IntegerField(read_only=True)
    boundary = GeometryField(precision=GEOJSON_PRECISION)

    class Meta:
        model = Barangay
        geo_field = "boundary"
        # `id` stays in `properties` so the frontend can promoteId: 'id'.
        id_field = False
        fields = ["id", "name", "code", "area_square_km", "subscriber_count"]


class BarangayPublicSerializer(GeoFeatureModelSerializer):
    """Boundary geometry + id/name only, served AllowAny (pre-auth registration)."""

    boundary = GeometryField(precision=GEOJSON_PRECISION)

    class Meta:
        model = Barangay
        geo_field = "boundary"
        id_field = False
        fields = ["id", "name"]


class HazardZoneSerializer(GeoFeatureModelSerializer):
    """One flood-susceptibility zone, simplified geometry for low zoom levels."""

    geom_simplified = GeometryField(precision=GEOJSON_PRECISION)

    class Meta:
        model = BarangaySusceptibility
        geo_field = "geom_simplified"
        id_field = False
        fields = ["id", "barangay", "level"]


class HazardZoneDetailedSerializer(GeoFeatureModelSerializer):
    """Same zones as `HazardZoneSerializer` but full-precision, for close-in zoom."""

    geom = GeometryField(precision=GEOJSON_PRECISION)

    class Meta:
        model = BarangaySusceptibility
        geo_field = "geom"
        id_field = False
        fields = ["id", "barangay", "level"]


class StreetSerializer(serializers.ModelSerializer):
    """Plain (non-geo) list — Street carries no geometry."""

    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = Street
        fields = ["id", "name", "barangay", "barangay_name", "susceptibility_level"]