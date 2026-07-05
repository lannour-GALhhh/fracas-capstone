from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from .models import EvacuationCenter


class EvacuationCenterSerializer(GeoFeatureModelSerializer):
    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = EvacuationCenter
        geo_field = "location"
        # Keep `id` in properties (see BarangayListSerializer for the rationale).
        id_field = False
        fields = ["id", "name", "capacity", "contact", "barangay", "barangay_name"]
