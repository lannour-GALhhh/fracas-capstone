import time
from datetime import datetime, timezone as dt_timezone

from django.core.management.base import BaseCommand
from django.utils import timezone

from barangays.models import Barangay
from rainfall_fetch.models import HourlyRainfall, RainfallSettings
from rainfall_fetch.tasks import CHUNK_DELAY, CHUNK_SIZE, _chunked, _get_with_retry, _query_groups, hourly_url


class Command(BaseCommand):
    help = (
        "One-time seed of the last 7 days of hourly rainfall from Open-Meteo, so the 6h/12h/24h/7d "
        "accumulations are right from day one instead of ramping up as hours are recorded. "
        "Existing hourly records are kept, never overwritten. Costs one Open-Meteo call per unique "
        "grid cell, so run `discover_rainfall_grid` first."
    )

    def handle(self, *args, **options):
        now = timezone.now()
        model_param = RainfallSettings.cached().model_param
        groups = _query_groups(list(Barangay.objects.select_related("rainfall_grid")))
        chunks = list(_chunked(groups, CHUNK_SIZE))
        created = 0

        for chunk_num, chunk in enumerate(chunks):
            lats = ",".join(str(g["lat"]) for g in chunk)
            lons = ",".join(str(g["lon"]) for g in chunk)
            try:
                batch = _get_with_retry(hourly_url(lats, lons, model_param)).json()
            except Exception as e:  # noqa: BLE001 - reported, remaining chunks still run
                self.stderr.write(f"Backfill chunk {chunk_num + 1}/{len(chunks)} failed: {e}")
                continue
            if isinstance(batch, dict):
                batch = [batch]

            rows = []
            for group, data in zip(chunk, batch):
                for t, mm in zip(data["hourly"]["time"], data["hourly"]["precipitation"]):
                    hour = datetime.fromisoformat(t).replace(tzinfo=dt_timezone.utc)
                    if hour > now:  # forecast hours aren't history
                        continue
                    rows.extend(
                        HourlyRainfall(barangay=b, hour=hour, precipitation=mm or 0)
                        for b in group["members"]
                    )
            created += len(HourlyRainfall.objects.bulk_create(rows, batch_size=5000, ignore_conflicts=True))

            if chunk_num < len(chunks) - 1:
                time.sleep(CHUNK_DELAY)

        self.stdout.write(f"Backfilled hourly rainfall: {created} row(s) offered, existing hours left untouched.")
