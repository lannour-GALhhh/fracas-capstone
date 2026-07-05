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
    Barangay
)
from .serializers import (
    BarangayListSerializer,
    BarangayPublicSerializer,
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