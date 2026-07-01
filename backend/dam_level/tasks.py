"""Dam-level ingestion.

Fetches the latest reading via the configured provider and stores it, deriving
rate-of-rise and spilling status. Failures are logged and swallowed so a flaky
scrape never breaks the scoring pipeline (scoring degrades gracefully instead).
"""

import logging

from celery import shared_task

from .models import Dam, DamReading
from .providers import DamProviderError, DamSnapshot, get_provider

logger = logging.getLogger(__name__)


def _rate_of_change(previous: DamReading | None, snapshot: DamSnapshot) -> float | None:
    if previous is None:
        return None
    hours = (snapshot.recorded_at - previous.recorded_at).total_seconds() / 3600
    if hours <= 0:
        return None
    return (snapshot.water_level - previous.water_level) / hours


@shared_task
def ingest_dam_level() -> dict:
    dam = Dam.objects.first()
    if dam is None:
        logger.warning("No Dam configured; skipping dam ingestion.")
        return {"stored": False, "reason": "no dam configured"}

    try:
        snapshot = get_provider().fetch()
    except DamProviderError as exc:
        logger.error("Dam ingestion failed: %s", exc)
        return {"stored": False, "reason": str(exc)}

    previous = dam.readings.first()  # latest (Meta ordering: -recorded_at)
    if previous is not None and previous.recorded_at == snapshot.recorded_at:
        return {"stored": False, "reason": "duplicate reading"}

    reading = DamReading.objects.create(
        dam=dam,
        water_level=snapshot.water_level,
        turbidity=snapshot.turbidity,
        rate_of_change=_rate_of_change(previous, snapshot),
        is_spilling=snapshot.water_level > dam.normal_level,
        recorded_at=snapshot.recorded_at,
    )
    logger.info("Stored dam reading: %.2fm @ %s", reading.water_level, reading.recorded_at)
    return {"stored": True, "water_level": reading.water_level}
