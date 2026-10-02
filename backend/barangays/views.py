import json

from django.contrib.gis.db.models.functions import AsGeoJSON
from django.contrib.gis.geos import Polygon
from django.contrib.gis.db.models import GeometryField
from django.db.models import Count, Func, Value
from django.http import HttpResponse
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


GEOJSON_PRECISION = 6
# Full-precision geometry is ~90 MB for the whole city, so it is only served per-viewport.
MAX_DETAIL_BBOX_DEG = 0.5


class ClipByBox2D(Func):
    """PostGIS ST_ClipByBox2D: cheap rectangle clip, keeps only the part of a zone inside the viewport."""

    function = "ST_ClipByBox2D"
    output_field = GeometryField(srid=4326)


def _parse_bbox(raw):
    """`west,south,east,north` -> (Polygon, (width, height), (w, s, e, n)), or None when absent. ValueError if malformed."""
    if not raw:
        return None
    west, south, east, north = (float(v) for v in raw.split(","))
    if not (west < east and south < north):
        raise ValueError("bbox must be west,south,east,north")
    return Polygon.from_bbox((west, south, east, north)), (east - west, north - south), (west, south, east, north)


@method_decorator(cache_page(60 * 15, key_prefix='hazard_zone_list'),
                  name='list',
                  )
class HazardZoneListView(viewsets.ReadOnlyModelViewSet):
    """Susceptibility zones as a GeoJSON FeatureCollection, built in PostGIS (ST_AsGeoJSON).

    `?detail=full` serves full-precision geometry and requires `?bbox=w,s,e,n`;
    without `detail` the simplified geometry is returned (optionally bbox-filtered).
    """

    queryset = BarangaySusceptibility.objects.all()
    pagination_class = None

    def list(self, request, *args, **kwargs):
        full = request.query_params.get("detail") == "full"
        try:
            parsed = _parse_bbox(request.query_params.get("bbox"))
        except ValueError:
            return Response({"detail": "bbox must be west,south,east,north"}, status=400)
        if full and parsed is None:
            return Response({"detail": "detail=full requires bbox"}, status=400)
        if full and max(parsed[1]) > MAX_DETAIL_BBOX_DEG:
            return Response({"detail": "bbox too large for detail=full"}, status=400)

        field = "geom" if full else "geom_simplified"
        qs = self.get_queryset()
        if parsed:
            qs = qs.filter(**{f"{field}__intersects": parsed[0]})
        if full:
            # Zones are large polygons: clip to the viewport so only the visible part is sent.
            envelope = Func(*(Value(v) for v in parsed[2]), Value(4326), function="ST_MakeEnvelope",
                            output_field=GeometryField(srid=4326))
            qs = qs.annotate(clipped=ClipByBox2D("geom", envelope))
            field = "clipped"
        rows = qs.annotate(geojson=AsGeoJSON(field, precision=GEOJSON_PRECISION)).values_list(
            "geojson", "barangay_id", "level"
        )
        # Geometry is already JSON text from PostGIS; splice it in rather than parse + re-dump it.
        features = ",".join(
            '{"type":"Feature","geometry":%s,"properties":%s}'
            % (geojson, json.dumps({"barangay": barangay_id, "level": level}))
            for geojson, barangay_id, level in rows
            if geojson  # a zone that only touches the bbox edge clips to empty
        )
        body = '{"type":"FeatureCollection","features":[%s]}' % features
        return HttpResponse(body, content_type="application/json")


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