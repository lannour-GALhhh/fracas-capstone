# DJANGO
from django.db.models import Count
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

# REST FRAMEWORK
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# LOCAL
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
    # `subscriber_count` (residents subscribed to this barangay's alerts) is
    # annotated here so it rides along in each feature's GeoJSON properties —
    # the map tooltip reads it client-side with no extra request.
    queryset = Barangay.objects.annotate(subscriber_count=Count("subscribers"))
    serializer_class = BarangayListSerializer
    # The barangay set is bounded and served as one GeoJSON FeatureCollection
    # for the map, so it must not be paginated (pagination both nests the
    # features under `results` and truncates to PAGE_SIZE).
    pagination_class = None


@method_decorator(cache_page(60 * 15, key_prefix='barangay_public'),
                  name='list',
                  )
class BarangayPublicView(viewsets.ReadOnlyModelViewSet):
    # Public (AllowAny) boundaries — geometry + id/name only — so the mobile app
    # can resolve a resident's barangay by point-in-polygon during pre-auth
    # registration. Same unpaginated FeatureCollection shape, minus the
    # semi-private subscriber count.
    queryset = Barangay.objects.all()
    serializer_class = BarangayPublicSerializer
    permission_classes = [AllowAny]
    pagination_class = None


@method_decorator(cache_page(60 * 15, key_prefix='hazard_zone_list'),
                  name='list',
                  )
class HazardZoneListView(viewsets.ReadOnlyModelViewSet):
    # Bounded (<=505 rows) and served as one GeoJSON FeatureCollection for the
    # hazard-zone map layer, so it must not be paginated — same rationale as
    # BarangayListView.
    queryset = BarangaySusceptibility.objects.select_related("barangay")
    serializer_class = HazardZoneSerializer
    pagination_class = None

    def get_serializer_class(self):
        # `?detail=full` swaps in the authoritative, unsimplified geometry —
        # the frontend only requests it once zoomed in far enough that the
        # extra vertices are visible. `cache_page` keys on the full request
        # path, so the two variants are cached independently.
        if self.request.query_params.get("detail") == "full":
            return HazardZoneDetailedSerializer
        return HazardZoneSerializer


class HighRiskStreetListView(viewsets.ReadOnlyModelViewSet):
    # Streets in barangays whose dominant susceptibility is high/very_high —
    # see `load_high_risk_streets`. No geometry, so it's a plain paginated
    # list rather than a GeoJSON FeatureCollection.
    queryset = Street.objects.select_related("barangay")
    serializer_class = StreetSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        barangay_id = self.request.query_params.get("barangay")
        if barangay_id:
            qs = qs.filter(barangay_id=barangay_id)
        return qs