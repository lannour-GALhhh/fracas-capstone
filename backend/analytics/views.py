"""Operator-only, read-only analytics endpoints."""

from django.core.cache import cache
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsOperator

from .services import (
    hotspots,
    model_performance,
    rainfall_timeline,
    summary,
)
from .services.window import parse_window

CACHE_TTL = 300


class _OperatorAnalyticsView(APIView):
    permission_classes = [IsOperator]
    # Subclasses set a cache-key prefix and a builder.
    cache_prefix = ""

    def build(self, since, days):  # pragma: no cover - overridden
        raise NotImplementedError

    def get(self, request):
        since, days = parse_window(request)
        key = f"analytics:{self.cache_prefix}:{days}"
        data = cache.get(key)
        if data is None:
            data = self.build(since, days)
            cache.set(key, data, CACHE_TTL)
        return Response(data)


class SummaryView(_OperatorAnalyticsView):
    cache_prefix = "summary"

    def build(self, since, days):
        return summary.build_summary(since)


class HotspotsView(_OperatorAnalyticsView):
    cache_prefix = "hotspots"

    def build(self, since, days):
        return hotspots.build_hotspots(since)


class RainfallTimelineView(_OperatorAnalyticsView):
    cache_prefix = "rainfall-timeline"

    def build(self, since, days):
        return rainfall_timeline.build_rainfall_timeline(since, days)


class ModelPerformanceView(_OperatorAnalyticsView):
    cache_prefix = "model-performance"

    def build(self, since, days):
        return model_performance.build_model_performance()
