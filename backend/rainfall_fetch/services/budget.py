"""Daily Open-Meteo call budget.

The free API allows 10,000 calls/day and counts every location in a request as one call, retries
included. We count each attempt in the shared cache so the pipeline stops before Open-Meteo
locks us out, and so a deployment can tell up front whether its cell count leaves room to retry.
"""

import logging
import re

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from backend.schedules import CRON_SCHEDULE

logger = logging.getLogger(__name__)

DEFAULT_RUN_INTERVAL_MIN = 15
RETRY_HEADROOM = 0.75  # steady-state use above this share of the limit leaves too little to retry with


def _key() -> str:
    return f"rainfall:open-meteo-calls:{timezone.now():%Y-%m-%d}"  # Open-Meteo's day is UTC


def locations_in(url: str) -> int:
    match = re.search(r"latitude=([^&]*)", url)
    return len(match.group(1).split(",")) if match else 1


def calls_today() -> int:
    try:
        return int(cache.get(_key(), 0))
    except Exception:  # noqa: BLE001 - an unreachable cache must never stop ingestion
        return 0


def record(calls: int) -> None:
    try:
        cache.add(_key(), 0, timeout=60 * 60 * 26)
        cache.incr(_key(), calls)
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Could not record Open-Meteo calls: {e}")


def can_spend(calls: int) -> bool:
    return calls_today() + calls <= settings.RAINFALL_DAILY_CALL_LIMIT


def runs_per_day() -> int:
    """Pipeline runs/day, read from the `*/N` minute field of the cron schedule."""
    match = re.match(r"\*/(\d+) ", CRON_SCHEDULE["pipeline"]["cron"])
    interval = int(match.group(1)) if match else DEFAULT_RUN_INTERVAL_MIN
    return 24 * 60 // interval


def expected_daily_calls(cells: int) -> int:
    return cells * runs_per_day()


def has_retry_headroom(cells: int) -> bool:
    return expected_daily_calls(cells) <= settings.RAINFALL_DAILY_CALL_LIMIT * RETRY_HEADROOM
