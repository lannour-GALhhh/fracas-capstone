"""City-wide rainfall trend with actual flood events overlaid."""

from django.db.models.functions import Trunc

from django.db.models import Avg, Max

from rainfall_fetch.models import Rainfall

from .summary import _confirmed_events

# Longer windows switch to daily buckets so the chart stays legible.
HOURLY_MAX_DAYS = 7


def _granularity(days):
    return "hour" if days <= HOURLY_MAX_DAYS else "day"


def build_rainfall_timeline(since, days):
    gran = _granularity(days)
    buckets = (
        Rainfall.objects.filter(recorded_at__gte=since)
        .annotate(bucket=Trunc("recorded_at", gran))
        .values("bucket")
        .annotate(avg_24h=Avg("accumulated_24hr"), max_24h=Max("accumulated_24hr"))
        .order_by("bucket")
    )
    series = [
        {"bucket": r["bucket"], "avg_24h": r["avg_24h"], "max_24h": r["max_24h"]}
        for r in buckets
    ]

    events = [
        {
            "occurred_at": f["occurred_at"],
            "severity": f["severity"],
            "barangay": f["barangay__name"],
        }
        for f in _confirmed_events(since)
        .select_related("barangay")
        .values("occurred_at", "severity", "barangay__name")
        .order_by("occurred_at")
    ]

    return {"granularity": gran, "series": series, "events": events}
