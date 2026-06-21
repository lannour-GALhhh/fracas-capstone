from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import (
    Barangay
)

class BarangayListSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Barangay
        geo_field = "boundary"
        id_field = "id"
        fields = ["id", "name", "code", "area_square_km"]