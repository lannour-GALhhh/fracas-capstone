from django.db.models import Count
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Barangay,
    BarangaySusceptibility,
    Street,
)
from .serializers import (
    BarangayListSerializer,
    BarangayPublicSerializer,
    HazardZoneDetailedSerializer,
    HazardZoneSerializer,
    StreetSerializer,
)

@method_decorator(cache_page(60 * 15, key_prefix='barangay_list'),
                  name='list',
                  )
class BarangayListView(viewsets.ReadOnlyModelViewSet):
    queryset = Barangay.objects.annotate(subscriber_count=Count("subscribers"))
    serializer_class = BarangayListSerializer
    pagination_class = None  # served as one unpaginated FeatureCollection


@method_decorator(cache_page(60 * 15, key_prefix='barangay_public'),
                  name='list',
                  )
class BarangayPublicView(viewsets.ReadOnlyModelViewSet):
    queryset = Barangay.objects.all()
    serializer_class = BarangayPublicSerializer
    permission_classes = [AllowAny]
    pagination_class = None


@method_decorator(cache_page(60 * 15, key_prefix='hazard_zone_list'),
                  name='list',
                  )
class HazardZoneListView(viewsets.ReadOnlyModelViewSet):
    queryset = BarangaySusceptibility.objects.select_related("barangay")
    serializer_class = HazardZoneSerializer
    pagination_class = None

    def get_serializer_class(self):
        if self.request.query_params.get("detail") == "full":
            return HazardZoneDetailedSerializer
        return HazardZoneSerializer


class HighRiskStreetListView(viewsets.ReadOnlyModelViewSet):
    queryset = Street.objects.select_related("barangay")
    serializer_class = StreetSerializer
    pagination_class = None  # panel always filters to one barangay; default page size would truncate

    def get_queryset(self):
        qs = super().get_queryset()
        barangay_id = self.request.query_params.get("barangay")
        if barangay_id:
            qs = qs.filter(barangay_id=barangay_id)
        return qs