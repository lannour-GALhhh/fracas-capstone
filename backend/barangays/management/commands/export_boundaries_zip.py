"""Export the loaded barangays as an upload-ready zip for Admin > GIS data."""

import zipfile
from pathlib import Path

from django.core.management.base import BaseCommand
from django.core.serializers import serialize

from barangays.models import Barangay


class Command(BaseCommand):
    help = "Write barangay boundaries to a GeoJSON zip that the GIS import page accepts."

    def add_arguments(self, parser):
        parser.add_argument("--output", default="barangay_boundaries.zip")

    def handle(self, *args, **options):
        geojson = serialize(
            "geojson",
            Barangay.objects.all(),
            geometry_field="boundary",
            fields=("code", "name", "province_code", "area_square_km"),
        )
        # The importer reads the PSGC-style field names used by the source GDB.
        geojson = (
            geojson.replace('"code"', '"adm4_pcode"')
            .replace('"name"', '"adm4_name"')
            .replace('"province_code"', '"adm3_pcode"')
            .replace('"area_square_km"', '"area_sqkm"')
        )
        out = Path(options["output"])
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("barangay_boundaries.geojson", geojson)
        self.stdout.write(self.style.SUCCESS(f"Wrote {out} ({out.stat().st_size / 1e6:.1f} MB)"))
