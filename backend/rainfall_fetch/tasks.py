import requests
import logging
import time

from celery import shared_task

from django.utils import timezone

from barangays.models import Barangay
from monitoring.constants import SOURCE_RAINFALL
from monitoring.services.recorder import record_failure, record_success
from .models import Rainfall

logger = logging.getLogger(__name__)

# Batched multi-location calls avoid Open-Meteo's per-request burst rate limit.
CHUNK_SIZE = 25
CHUNK_DELAY = 2  # seconds between chunk requests, to avoid bursting the rate limit
REQUEST_TIMEOUT = 20
RETRY_BACKOFF = 5

# Every 15-minute step out to 4 hours (16 points).
FORECAST_STEPS_MIN = [15 * n for n in range(1, 17)]


def hourly_url(latitudes: str, longitudes: str) -> str:
    return (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitudes}&longitude={longitudes}"
        f"&current=precipitation&hourly=precipitation"
        f"&past_days=7&forecast_days=1"
    )


def minutely_url(latitudes: str, longitudes: str) -> str:
    # Kept separate from hourly_url: past_days + minutely_15 together times out.
    return (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitudes}&longitude={longitudes}"
        f"&minutely_15=precipitation&forecast_days=1"
    )


def _chunked(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def _get_with_retry(url, *, retries=1):
    """GET with one backed-off retry on failure."""
    last_exc = None
    for attempt in range(retries + 1):
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response
        except Exception as e:  # noqa: BLE001 - retried, then re-raised for the caller to log
            last_exc = e
            if attempt < retries:
                time.sleep(RETRY_BACKOFF)
    raise last_exc


def _accumulate(precipitation, index, hours):
    """Sum the `hours` hourly buckets ending at (and including) `index`."""
    start = max(0, index - hours + 1)
    return round(sum(v or 0 for v in precipitation[start:index + 1]), 2)

def parse_rainfall_data(data, barangay_name=None):
    current_rainfall = data['current']['precipitation']
    current_time = data['current']['time']
    current_hour = current_time[:13]
    times = data['hourly']['time']
    precipitation = data['hourly']['precipitation']

    index = next((i for i, t in enumerate(times) if t.startswith(current_hour)), None)

    quarter_times = data['minutely_15']['time']
    quarter_precipitation = data['minutely_15']['precipitation']
    quarter_index = next((i for i, t in enumerate(quarter_times) if t == current_time), None)

    if index is None or quarter_index is None:
        logger.warning(f"Current hour not found in forecast for {barangay_name}. Defaulting to 0")
        return {key: 0 for key in [
            'current_rainfall_strength',
            *[f'forecast_strength_{m}min' for m in FORECAST_STEPS_MIN],
            'accumulated_6hr',
            'accumulated_12hr',
            'accumulated_24hr',
            'accumulated_7day',
            ]}

    # `x` is a count of 15-minute buckets ahead of now.
    forecast_quarter = lambda x: (quarter_precipitation[quarter_index + x] or 0) if quarter_index + x < len(quarter_precipitation) else 0

    return {
        'current_rainfall_strength': current_rainfall or 0,
        **{
            f'forecast_strength_{m}min': forecast_quarter(m // 15)
            for m in FORECAST_STEPS_MIN
        },
        'accumulated_6hr': _accumulate(precipitation, index, 6),
        'accumulated_12hr': _accumulate(precipitation, index, 12),
        'accumulated_24hr': _accumulate(precipitation, index, 24),
        'accumulated_7day': _accumulate(precipitation, index, 24 * 7),
    }

@shared_task
def fetch_rainfall_information():
    barangays = list(Barangay.objects.all())
    timestamp = timezone.now()
    readings = []

    chunks = list(_chunked(barangays, CHUNK_SIZE))
    for chunk_num, chunk in enumerate(chunks):
        centroids = [b.boundary.centroid for b in chunk]
        lats = ",".join(str(c.y) for c in centroids)
        lons = ",".join(str(c.x) for c in centroids)

        try:
            hourly_batch = _get_with_retry(hourly_url(lats, lons)).json()
            minutely_batch = _get_with_retry(minutely_url(lats, lons)).json()
            # A single-location batch comes back as an object, not a list.
            if isinstance(hourly_batch, dict):
                hourly_batch = [hourly_batch]
            if isinstance(minutely_batch, dict):
                minutely_batch = [minutely_batch]
        except Exception as e:
            names = ", ".join(b.name for b in chunk)
            logger.error(f"Failed to fetch rainfall batch for [{names}]: {e}")
        else:
            for barangay, hourly_data, minutely_data in zip(chunk, hourly_batch, minutely_batch):
                try:
                    data = hourly_data
                    data['minutely_15'] = minutely_data['minutely_15']
                    parsed_data = parse_rainfall_data(data, barangay.name)

                    readings.append(Rainfall(
                        barangay=barangay,
                        recorded_at=timestamp,
                        **parsed_data
                    ))

                    logger.info(f"Fetched rainfall information for {barangay.name}: {parsed_data}")
                except Exception as e:
                    logger.error(f"Failed to parse rainfall information for: {barangay.name}: {e}")
                    continue

        if chunk_num < len(chunks) - 1:
            time.sleep(CHUNK_DELAY)

    if readings:
        Rainfall.objects.bulk_create(readings)
        logger.info(f"Stored {len(readings)} rainfall readings.")
        record_success(SOURCE_RAINFALL)
    else:
        logger.error("No rainfall readings stored this cycle.")
        record_failure(SOURCE_RAINFALL, "no readings stored")
