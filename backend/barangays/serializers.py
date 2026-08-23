from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework_gis.fields import GeometryField
from .models import (
    Barangay,
    BarangaySusceptibility,
    Street,
)

# ~0.1 m at Zamboanga's latitude — well below any meaningful map precision, but
# clamps the ~15-digit float coordinates GeoDjango emits by default, roughly
# halving every GeoJSON map payload at zero visible cost.
GEOJSON_PRECISION = 6

class BarangayListSerializer(GeoFeatureModelSerializer):
    # Annotated on the queryset (see BarangayListView); count of residents
    # subscribed to this barangay's alerts.
    subscriber_count = serializers.IntegerField(read_only=True)
    boundary = GeometryField(precision=GEOJSON_PRECISION)

    class Meta:
        model = Barangay
        geo_field = "boundary"
        # Keep `id` inside `properties` (not the GeoJSON top-level Feature id) so
        # the frontend can promote it via `promoteId: 'id'` and join the risk
        # snapshot on `feature.properties.id`. With id_field set, DRF-GIS would
        # move the pk to the top level and drop it from properties, which made
        # `feature.properties.id` undefined → `NaN` in the detail request URL.
        id_field = False
        fields = ["id", "name", "code", "area_square_km", "subscriber_count"]


class BarangayPublicSerializer(GeoFeatureModelSerializer):
    """Boundary geometry + id/name only — no subscriber count or other detail.

    Served AllowAny so the mobile app can resolve a resident's barangay by
    point-in-polygon during pre-auth registration. Deliberately omits
    `subscriber_count` (the one semi-private field) so nothing sensitive is
    exposed anonymously; barangay boundaries themselves are public gov data."""

    boundary = GeometryField(precision=GEOJSON_PRECISION)

    class Meta:
        model = Barangay
        geo_field = "boundary"
        id_field = False
        fields = ["id", "name"]


class HazardZoneSerializer(GeoFeatureModelSerializer):
    """One flood-susceptibility zone (Barangay x SusceptibilityLevel), simplified
    for MapLibre. See `barangays.services.dominant_susceptibility_by_barangay` for
    the worst-case-per-barangay aggregate the risk engine actually scores on —
    this is the full zone geometry for the map layer. Served at low zoom levels;
    see `HazardZoneDetailedSerializer` for the close-in variant."""

    geom_simplified = GeometryField(precision=GEOJSON_PRECISION)

    class Meta:
        model = BarangaySusceptibility
        geo_field = "geom_simplified"
        id_field = False
        fields = ["id", "barangay", "level"]


class HazardZoneDetailedSerializer(GeoFeatureModelSerializer):
    """Same zones as `HazardZoneSerializer` but with the full-precision,
    authoritative `geom` — no PostGIS generalization pass. Heavier payload, so
    it's only fetched once the map is zoomed in far enough that the extra
    vertices are actually visible (see `HazardZoneListView.get_serializer_class`
    and the frontend's zoom-gated `useHazardZonesDetailed`)."""

    geom = GeometryField(precision=GEOJSON_PRECISION)

    class Meta:
        model = BarangaySusceptibility
        geo_field = "geom"
        id_field = False
        fields = ["id", "barangay", "level"]


class StreetSerializer(serializers.ModelSerializer):
    """Plain (non-geo) list — Street carries no geometry, just a name and the
    barangay it was matched into. See `load_high_risk_streets`."""

    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = Street
        fields = ["id", "name", "barangay", "barangay_name", "susceptibility_level"]