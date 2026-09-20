from datetime import timedelta

from django.db.models import Max, Sum
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Rainfall
from .serializers import RainfallSerializer

MAX_HISTORY_DAYS = 30

# Readings arrive on a 15-minute cadence.
READING_INTERVAL_HOURS = 0.25


class RainfallViewset(viewsets.ReadOnlyModelViewSet):
    """Read-only access to rainfall readings. Filter with `?barangay=<id>`."""

    queryset = Rainfall.objects.all()
    serializer_class = RainfallSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        barangay_id = self.request.query_params.get("barangay")
        if barangay_id:
            qs = qs.filter(barangay_id=barangay_id)
        return qs

    @action(detail=False, methods=["get"])
    def history(self, request):
        """Peak + accumulated rainfall per bucket over the trailing `days` window."""
        barangay_id = request.query_params.get("barangay")
        if not barangay_id:
            return Response({"detail": "barangay query param is required."}, status=400)

        try:
            days = int(request.query_params.get("days", 7))
        except ValueError:
            days = 7
        days = min(max(days, 1), MAX_HISTORY_DAYS)

        granularity = request.query_params.get("granularity", "hour")
        trunc = TruncDate if granularity == "day" else TruncHour

        since = timezone.now() - timedelta(days=days)
        rows = (
            Rainfall.objects
            .filter(barangay_id=barangay_id, recorded_at__gte=since)
            .annotate(bucket=trunc("recorded_at"))
            .values("bucket")
            .annotate(
                peak_mm_hr=Max("current_rainfall_strength"),
                strength_sum=Sum("current_rainfall_strength"),
            )
            .order_by("bucket")
        )

        return Response([
            {
                "recorded_at": row["bucket"].isoformat(),
                "peak_mm_hr": round(row["peak_mm_hr"] or 0, 2),
                "accumulated_mm": round((row["strength_sum"] or 0) * READING_INTERVAL_HOURS, 2),
            }
            for row in rows
        ])
