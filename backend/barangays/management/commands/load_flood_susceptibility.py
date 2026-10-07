"""Load flood-susceptibility zones from the hazard shapefile, intersected against barangay boundaries."""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from barangays.importers.susceptibility import (
    MIN_AREA_SQM,
    SusceptibilityImportError,
    import_susceptibility,
)

DEFAULT_SHAPEFILE = Path(settings.BASE_DIR) / "zbga-city-flood-shapefile" / "ZAM_FLOOD.shp"


class Command(BaseCommand):
    help = "Load BarangaySusceptibility rows from the ZAM_FLOOD hazard shapefile."

    def add_arguments(self, parser):
        parser.add_argument("--shapefile", default=str(DEFAULT_SHAPEFILE))
        parser.add_argument("--simplify-tolerance-m", type=float, default=10.0)

    def handle(self, *args, **options):
        shapefile = Path(options["shapefile"])
        if not shapefile.exists():
            raise CommandError(f"Shapefile not found: {shapefile}")
        try:
            result = import_susceptibility(shapefile, options["simplify_tolerance_m"], log=self.stdout.write)
        except SusceptibilityImportError as exc:
            raise CommandError(str(exc))

        self.stdout.write(
            self.style.SUCCESS(
                f"Loaded {result['loaded']} BarangaySusceptibility row(s) (replaced {result['replaced']} existing). "
                f"Skipped {result['skipped_slivers']} sliver(s) < {MIN_AREA_SQM}m^2. "
                f"{result['made_valid']} source class(es) needed make_valid(). "
                f"Rebuilt display geometry for {result['rebuilt']} zone(s)."
            )
        )
