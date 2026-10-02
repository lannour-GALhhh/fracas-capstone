import time

from django.core.management.base import BaseCommand
from django.db import transaction

from barangays.models import Barangay
from rainfall_fetch.models import BarangayRainfallGrid
from rainfall_fetch.tasks import CHUNK_DELAY, CHUNK_SIZE, REQUEST_TIMEOUT, _chunked, _get_with_retry


def _discovery_url(latitudes: str, longitudes: str) -> str:
    # Minimal params: we only need the per-location latitude/longitude Open-Meteo
    # echoes back, which is the center of the grid-cell it actually used.
    return (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitudes}&longitude={longitudes}&current=precipitation"
    )


class Command(BaseCommand):
    help = (
        "Empirically discovers which Open-Meteo weather grid-cell each barangay resolves to, "
        "by reading back the latitude/longitude Open-Meteo echoes per location (never assumed "
        "from geographic distance). Barangays sharing a grid cell get identical weather data, "
        "so fetch_rainfall_information can query once per unique cell instead of once per barangay. "
        "Costs one Open-Meteo call per barangay to run; only needs re-running if barangay "
        "boundaries/centroids change."
    )

    def handle(self, *args, **options):
        barangays = list(Barangay.objects.all())
        chunks = list(_chunked(barangays, CHUNK_SIZE))

        discovered = 0
        failed = []

        for chunk_num, chunk in enumerate(chunks):
            centroids = [b.boundary.centroid for b in chunk]
            lats = ",".join(str(c.y) for c in centroids)
            lons = ",".join(str(c.x) for c in centroids)

            try:
                batch = _get_with_retry(_discovery_url(lats, lons), retries=2).json()
                if isinstance(batch, dict):
                    batch = [batch]
            except Exception as e:  # noqa: BLE001 - logged and skipped, rest of the run continues
                names = ", ".join(b.name for b in chunk)
                self.stderr.write(f"Failed to discover grid cells for [{names}]: {e}")
                failed.extend(chunk)
            else:
                with transaction.atomic():
                    for barangay, data in zip(chunk, batch):
                        BarangayRainfallGrid.objects.update_or_create(
                            barangay=barangay,
                            defaults={"grid_lat": data["latitude"], "grid_lon": data["longitude"]},
                        )
                        discovered += 1

            if chunk_num < len(chunks) - 1:
                time.sleep(CHUNK_DELAY)

        unique_cells = (
            BarangayRainfallGrid.objects.values_list("grid_lat", "grid_lon").distinct().count()
        )

        self.stdout.write(
            f"Discovered grid cells for {discovered}/{len(barangays)} barangays "
            f"-> {unique_cells} unique Open-Meteo grid cell(s)."
        )
        if failed:
            self.stderr.write(
                f"{len(failed)} barangay(s) failed and were left unmapped: "
                f"{', '.join(b.name for b in failed)}. Re-run this command to retry them."
            )
