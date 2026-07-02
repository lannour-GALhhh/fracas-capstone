"""Dam-level ingestion.

Fetches the latest reading via the configured provider and stores it, deriving
rate-of-rise and spilling status. Failures are logged and swallowed so a flaky
scrape never breaks the scoring pipeline (scoring degrades gracefully instead).
"""

import logging

from celery import shared_task

from monitoring.constants import SOURCE_DAM
from monitoring.services.recorder import record_failure, record_success

from .models import Dam, DamReading
from .providers import DamProviderError, get_provider
from .services.reading import make_reading

logger = logging.getLogger(__name__)


@shared_task
def ingest_dam_level() -> dict:
    dam = Dam.objects.first()
    if dam is None:
        logger.warning("No Dam configured; skipping dam ingestion.")
        record_failure(SOURCE_DAM, "no dam configured")
        return {"stored": False, "reason": "no dam configured"}

    try:
        snapshot = get_provider().fetch()
    except DamProviderError as exc:
        logger.error("Dam ingestion failed: %s", exc)
        record_failure(SOURCE_DAM, str(exc))
        return {"stored": False, "reason": str(exc)}

    # A reachable source is healthy even if this reading duplicates the last one.
    record_success(SOURCE_DAM)

    previous = dam.readings.first()  # latest (Meta ordering: -recorded_at)
    if previous is not None and previous.recorded_at == snapshot.recorded_at:
        return {"stored": False, "reason": "duplicate reading"}

    reading = make_reading(
        dam,
        previous,
        water_level=snapshot.water_level,
        recorded_at=snapshot.recorded_at,
        turbidity=snapshot.turbidity,
        source=DamReading.Source.SCRAPER,
    )
    reading.save()
    logger.info("Stored dam reading: %.2fm @ %s", reading.water_level, reading.recorded_at)
    return {"stored": True, "water_level": reading.water_level}
