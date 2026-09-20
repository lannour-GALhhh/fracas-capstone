"""Validation recall / mean-score trend across hindcast runs."""

from risk_score.models import ValidationRun

DEFAULT_LIMIT = 20


def build_model_performance(limit=DEFAULT_LIMIT):
    runs = (
        ValidationRun.objects.filter(status=ValidationRun.Status.DONE)
        .order_by("-created_at")
        .values("created_at", "recall", "mean_score", "events_evaluated", "hits")[:limit]
    )
    # Fetched newest-first for the LIMIT, returned oldest-first for the chart.
    return list(runs)[::-1]
