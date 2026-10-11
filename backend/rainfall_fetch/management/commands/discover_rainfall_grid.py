from django.core.management.base import BaseCommand

from barangays.models import Barangay
from rainfall_fetch.models import BarangayRainfallGrid
from rainfall_fetch.services.grid import ensure_grid_mapping


class Command(BaseCommand):
    help = (
        "Re-maps every barangay to the Open-Meteo weather grid cell it resolves to, for the active "
        "weather model. Barangays sharing a cell get identical weather, so the rainfall fetch queries "
        "once per unique cell. The fetch already maps new barangays by itself and the mapping resets "
        "when the model changes, so this is only needed to force a full refresh. Costs one "
        "Open-Meteo call per barangay."
    )

    def handle(self, *args, **options):
        mapped, failed = ensure_grid_mapping(remap=True)
        unique_cells = BarangayRainfallGrid.objects.values_list("grid_lat", "grid_lon").distinct().count()
        self.stdout.write(
            f"Discovered grid cells for {mapped}/{Barangay.objects.count()} barangays "
            f"-> {unique_cells} unique Open-Meteo grid cell(s)."
        )
        if failed:
            self.stderr.write(
                f"{len(failed)} barangay(s) failed and were left unmapped: "
                f"{', '.join(b.name for b in failed)}. Re-run this command to retry them."
            )
