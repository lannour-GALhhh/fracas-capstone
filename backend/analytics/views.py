"""Operator-only, read-only analytics endpoints.

Each view is a thin wrapper: parse the window, serve from a short-TTL cache, and
delegate the actual aggregation to a `services.*` function. The pipeline only
writes fresh data every 15 min, so caching per (endpoint, window) for a few
minutes avoids recomputing heavy history scans on every poll.
"""

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

# Comfortably shorter than the 15-min pipeline cadence: fresh enough, but the
# heavy hotspot/timeline scans run at most once per window per few minutes.
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
