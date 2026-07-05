from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets

from .models import EvacuationCenter
from .serializers import EvacuationCenterSerializer


@method_decorator(
    cache_page(60 * 15, key_prefix="evacuation_centers"),
    name="list",
)
class EvacuationCenterView(viewsets.ReadOnlyModelViewSet):
    # Active centers, served as one GeoJSON FeatureCollection for the mobile app to
    # download once and compute nearest-center client-side. Bounded set → no pagination.
    queryset = EvacuationCenter.objects.filter(is_active=True).select_related("barangay")
    serializer_class = EvacuationCenterSerializer
    pagination_class = None
