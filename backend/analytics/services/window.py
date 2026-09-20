"""Shared time-window parsing for the analytics endpoints."""

from datetime import timedelta

from django.utils import timezone

DEFAULT_DAYS = 30
MAX_DAYS = 90
MIN_DAYS = 1


def parse_window(request):
    """Return `(since_dt, days)` from the request's `?days=` param, clamped."""
    raw = request.query_params.get("days")
    try:
        days = int(raw) if raw is not None else DEFAULT_DAYS
    except (TypeError, ValueError):
        days = DEFAULT_DAYS
    days = max(MIN_DAYS, min(days, MAX_DAYS))
    since = timezone.now() - timedelta(days=days)
    return since, days
