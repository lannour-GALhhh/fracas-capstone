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
# Open-Meteo accepts up to 100 coordinates per call; batching all barangays into
# as few chunks as possible keeps the request burst (and 429 risk) low.
CHUNK_SIZE = 50
CHUNK_DELAY = 3  # seconds between chunk requests, to avoid bursting the rate limit
CALL_DELAY = 1  # seconds between the hourly and minutely calls within a chunk
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


def _get_with_retry(url, *, retries=2):
    """GET with backed-off retries. 429s back off longer (honoring Retry-After)
    than other failures, since retrying a rate limit quickly just re-triggers it."""
    last_exc = None
    for attempt in range(retries + 1):
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response
        except requests.exceptions.HTTPError as e:
            last_exc = e
            if attempt < retries:
                if e.response is not None and e.response.status_code == 429:
                    retry_after = e.response.headers.get("Retry-After")
                    delay = float(retry_after) if retry_after else RETRY_BACKOFF * (2 ** (attempt + 1))
                else:
                    delay = RETRY_BACKOFF
                time.sleep(delay)
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

def _query_groups(barangays):
    """Group barangays by the Open-Meteo grid-cell they actually resolve to
    (from `discover_rainfall_grid`), so each unique cell is queried once instead
    of once per barangay. Barangays not yet mapped fall back to their own
    centroid as a singleton group, so the task still works before discovery runs
    -- just without the dedup benefit for those barangays."""
    groups = {}
    for barangay in barangays:
        grid = getattr(barangay, "rainfall_grid", None)
        if grid is not None:
            key = (grid.grid_lat, grid.grid_lon)
            lat, lon = grid.grid_lat, grid.grid_lon
        else:
            centroid = barangay.boundary.centroid
            key = ("unmapped", barangay.id)
            lat, lon = centroid.y, centroid.x
        group = groups.setdefault(key, {"lat": lat, "lon": lon, "members": []})
        group["members"].append(barangay)
    return list(groups.values())


@shared_task
def fetch_rainfall_information():
    barangays = list(Barangay.objects.select_related("rainfall_grid").all())
    timestamp = timezone.now()
    readings = []

    groups = _query_groups(barangays)
    chunks = list(_chunked(groups, CHUNK_SIZE))
    for chunk_num, chunk in enumerate(chunks):
        lats = ",".join(str(g["lat"]) for g in chunk)
        lons = ",".join(str(g["lon"]) for g in chunk)

        try:
            hourly_batch = _get_with_retry(hourly_url(lats, lons)).json()
            time.sleep(CALL_DELAY)
            minutely_batch = _get_with_retry(minutely_url(lats, lons)).json()
            # A single-location batch comes back as an object, not a list.
            if isinstance(hourly_batch, dict):
                hourly_batch = [hourly_batch]
            if isinstance(minutely_batch, dict):
                minutely_batch = [minutely_batch]
        except Exception as e:
            names = ", ".join(b.name for g in chunk for b in g["members"])
            logger.error(f"Failed to fetch rainfall batch for [{names}]: {e}")
        else:
            for group, hourly_data, minutely_data in zip(chunk, hourly_batch, minutely_batch):
                data = hourly_data
                data['minutely_15'] = minutely_data['minutely_15']
                for barangay in group["members"]:
                    try:
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
