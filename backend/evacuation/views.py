"""Evacuation-center API.

Reads are open to any authenticated client (the mobile app downloads the active
set as one GeoJSON FeatureCollection to compute the nearest center locally).
Writes are operator-only and edited straight from the GIS console; every write
is recorded in the unified POI audit log via the shared PoiViewSet base.
"""

from poi.views import PoiViewSet

from .models import EvacuationCenter
from .serializers import EvacuationCenterSerializer, EvacuationCenterWriteSerializer


class EvacuationCenterViewSet(PoiViewSet):
    queryset = EvacuationCenter.objects.select_related("barangay")
    read_serializer_class = EvacuationCenterSerializer
    write_serializer_class = EvacuationCenterWriteSerializer
    poi_type = "evacuation"
    tracked_fields = ["name", "capacity", "contact", "is_active"]
