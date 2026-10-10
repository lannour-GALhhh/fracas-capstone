"""What has to happen when the admin switches the rainfall weather model."""

from django.utils import timezone

from rainfall_fetch.models import HourlyRainfall


def apply_model_change():
    """Re-run rainfall ingestion + scoring on the newly selected model.

    The current hour's stored bucket is dropped first: ingestion keeps the first value written
    for an hour, so without this the old model's total would keep feeding the accumulations
    until the next hour. Earlier hours keep the model they were recorded with.
    """
    from risk_score.tasks import run_scoring_pipeline

    hour = timezone.now().replace(minute=0, second=0, microsecond=0)
    HourlyRainfall.objects.filter(hour=hour).delete()
    run_scoring_pipeline.delay()
