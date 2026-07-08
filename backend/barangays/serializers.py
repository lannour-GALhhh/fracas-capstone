from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import (
    Barangay,
    BarangaySusceptibility,
)

class BarangayListSerializer(GeoFeatureModelSerializer):
    # Annotated on the queryset (see BarangayListView); count of residents
    # subscribed to this barangay's alerts.
    subscriber_count = serializers.IntegerField(read_only=True)

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

    class Meta:
        model = Barangay
        geo_field = "boundary"
        id_field = False
        fields = ["id", "name"]


class HazardZoneSerializer(GeoFeatureModelSerializer):
    """One flood-susceptibility zone (Barangay x SusceptibilityLevel), simplified
    for MapLibre. See `barangays.services.dominant_susceptibility_by_barangay` for
    the worst-case-per-barangay aggregate the risk engine actually scores on —
    this is the full zone geometry for the map layer."""

    class Meta:
        model = BarangaySusceptibility
        geo_field = "geom_simplified"
        id_field = False
        fields = ["id", "barangay", "level"]