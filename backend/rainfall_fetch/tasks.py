import requests
import logging
import time
from datetime import timedelta

from celery import shared_task

from django.conf import settings
from django.utils import timezone

from barangays.models import Barangay
from monitoring.constants import SOURCE_RAINFALL
from monitoring.services.recorder import record_failure, record_success
from .models import HourlyRainfall, Rainfall, RainfallSettings

logger = logging.getLogger(__name__)

# Batched multi-location calls avoid Open-Meteo's per-request burst rate limit.
# Open-Meteo accepts up to 100 coordinates per call; batching all barangays into
# as few chunks as possible keeps the request burst (and 429 risk) low.
CHUNK_SIZE = 50
CHUNK_DELAY = 3  # seconds between chunk requests, to avoid bursting the rate limit
CALL_DELAY = 1  # seconds between the hourly and minutely calls within a chunk
REQUEST_TIMEOUT = 20
RETRY_BACKOFF = 5

# Trailing windows (hours) for the accumulation fields, summed from our own hourly records.
ACCUMULATION_WINDOWS = {"accumulated_6hr": 6, "accumulated_12hr": 12, "accumulated_24hr": 24, "accumulated_7day": 24 * 7}

# minutely_15 / current amounts cover 15 minutes; x4 gives mm/hr.
INTENSITY_PER_STEP = 4

# Every 15-minute step out to 4 hours (16 points).
FORECAST_STEPS_MIN = [15 * n for n in range(1, 17)]


def hourly_url(latitudes: str, longitudes: str, model_param: str = "") -> str:
    # Only used by `backfill_rainfall_history`; the regular fetch no longer asks for history.
    return (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitudes}&longitude={longitudes}"
        f"&current=precipitation&hourly=precipitation"
        f"&past_days=7&forecast_days=1{model_param}"
    )


def minutely_url(latitudes: str, longitudes: str, model_param: str = "") -> str:
    # `current` and `hourly` ride along so the regular fetch needs just this one request per chunk.
    return (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitudes}&longitude={longitudes}"
        f"&current=precipitation&minutely_15=precipitation&forecast_days=1{model_param}"
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


def _intensity(mm_per_15min):
    """Open-Meteo's `current`/`minutely_15` precipitation is mm per 15-minute step; convert to
    mm/hr (what the engine's curves expect), then zero trace drizzle below
    `RAINFALL_NOISE_FLOOR_MM_HR` that the forecast model invents."""
    mm_hr = (mm_per_15min or 0) * INTENSITY_PER_STEP
    return mm_hr if mm_hr >= settings.RAINFALL_NOISE_FLOOR_MM_HR else 0


def _hour_total(data, hour):
    """mm that fell in the hour *ending* at `hour` (Open-Meteo labels an hourly sum by its end),
    or None if the response doesn't carry that hour. This is the true hourly amount; `current`
    is only the last 15 minutes and must not stand in for it."""
    label = hour.strftime("%Y-%m-%dT%H:%M")
    times = data.get('hourly', {}).get('time', [])
    if label not in times:
        return None
    return data['hourly']['precipitation'][times.index(label)] or 0


def _quarter_index(data):
    """Index of the current 15-minute bucket in `minutely_15`, or None if it isn't there."""
    return next(
        (i for i, t in enumerate(data['minutely_15']['time']) if t == data['current']['time']), None
    )


def parse_rainfall_data(data, barangay_name=None):
    """Current intensity + 4h forecast, all in mm/hr from one location's response. Accumulations are
    computed separately from our stored hourly records (see `_accumulations`)."""
    quarter_index = _quarter_index(data)
    if quarter_index is None:
        logger.warning(f"Current time not found in forecast for {barangay_name}. Defaulting to 0")
        return {key: 0 for key in [
            'current_rainfall_strength',
            *[f'forecast_strength_{m}min' for m in FORECAST_STEPS_MIN],
            ]}

    quarter_precipitation = data['minutely_15']['precipitation']
    # `x` is a count of 15-minute buckets ahead of now.
    forecast_quarter = lambda x: _intensity(quarter_precipitation[quarter_index + x]) if quarter_index + x < len(quarter_precipitation) else 0

    return {
        'current_rainfall_strength': _intensity(data['current']['precipitation']),
        **{
            f'forecast_strength_{m}min': forecast_quarter(m // 15)
            for m in FORECAST_STEPS_MIN
        },
    }


def _accumulations(barangay_ids, hour):
    """{barangay_id: {accumulated_6hr: mm, ...}} summed from stored hourly buckets.

    Each window is the last N buckets ending at (and including) `hour`; hours we never
    recorded count as 0, so totals ramp up over the first week after a cold start
    (see `backfill_rainfall_history`)."""
    longest = max(ACCUMULATION_WINDOWS.values())
    rows = HourlyRainfall.objects.filter(
        barangay_id__in=barangay_ids, hour__gt=hour - timedelta(hours=longest), hour__lte=hour
    ).values_list("barangay_id", "hour", "precipitation")
    result = {bid: dict.fromkeys(ACCUMULATION_WINDOWS, 0.0) for bid in barangay_ids}
    for bid, row_hour, mm in rows:
        age_hours = int((hour - row_hour).total_seconds() // 3600)
        for field, window in ACCUMULATION_WINDOWS.items():
            if age_hours < window:
                result[bid][field] += mm
    return {bid: {f: round(v, 2) for f, v in accs.items()} for bid, accs in result.items()}


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
    hour = timestamp.replace(minute=0, second=0, microsecond=0)
    parsed_by_barangay = {}  # barangay -> (parsed forecast, mm in the hour ending `hour`, or None)

    model_param = RainfallSettings.cached().model_param
    groups = _query_groups(barangays)
    chunks = list(_chunked(groups, CHUNK_SIZE))
    for chunk_num, chunk in enumerate(chunks):
        lats = ",".join(str(g["lat"]) for g in chunk)
        lons = ",".join(str(g["lon"]) for g in chunk)

        try:
            batch = _get_with_retry(minutely_url(lats, lons, model_param)).json()
            # A single-location batch comes back as an object, not a list.
            if isinstance(batch, dict):
                batch = [batch]
        except Exception as e:
            names = ", ".join(b.name for g in chunk for b in g["members"])
            logger.error(f"Failed to fetch rainfall batch for [{names}]: {e}")
        else:
            for group, data in zip(chunk, batch):
                for barangay in group["members"]:
                    try:
                        parsed = parse_rainfall_data(data, barangay.name)
                        parsed_by_barangay[barangay] = (parsed, _hour_total(data, hour))
                    except Exception as e:
                        logger.error(f"Failed to parse rainfall information for: {barangay.name}: {e}")
                        continue

        if chunk_num < len(chunks) - 1:
            time.sleep(CHUNK_DELAY)

    if not parsed_by_barangay:
        logger.error("No rainfall readings stored this cycle.")
        record_failure(SOURCE_RAINFALL, "no readings stored")
        return

    # Record the hour's total once (the first run of the hour wins) at the exact hour mark.
    # Skip responses without that hour: a zeroed placeholder must not claim it.
    HourlyRainfall.objects.bulk_create(
        [
            HourlyRainfall(barangay=b, hour=hour, precipitation=total)
            for b, (_, total) in parsed_by_barangay.items() if total is not None
        ],
        ignore_conflicts=True,
    )
    accumulations = _accumulations([b.id for b in parsed_by_barangay], hour)

    readings = [
        Rainfall(barangay=b, recorded_at=timestamp, **parsed, **accumulations[b.id])
        for b, (parsed, _) in parsed_by_barangay.items()
    ]
    Rainfall.objects.bulk_create(readings)
    logger.info(f"Stored {len(readings)} rainfall readings.")
    record_success(SOURCE_RAINFALL)
