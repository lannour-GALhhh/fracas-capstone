"""Load evacuation centers from a CSV.

Columns: ``name, latitude, longitude`` (required) and optional ``capacity``,
``contact``, ``barangay_code``. The barangay is resolved from ``barangay_code``
(matching ``Barangay.code``) when given, otherwise by point-in-polygon over the
loaded boundaries. Idempotent on ``(name, location)``.

    python manage.py load_evacuation_centers evacuation_centers.csv
"""

import csv

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError

from barangays.models import Barangay
from evacuation.models import EvacuationCenter


class Command(BaseCommand):
    help = "Load evacuation centers from a CSV file."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str)

    def handle(self, *args, **options):
        path = options["csv_path"]
        created = updated = skipped = 0

        try:
            fh = open(path, newline="", encoding="utf-8")
        except OSError as exc:
            raise CommandError(f"Cannot open {path}: {exc}")

        with fh:
            for row in csv.DictReader(fh):
                name = (row.get("name") or "").strip()
                try:
                    lat = float(row["latitude"])
                    lng = float(row["longitude"])
                except (KeyError, ValueError):
                    skipped += 1
                    self.stderr.write(f"Skipping row with bad/missing coords: {row!r}")
                    continue
                if not name:
                    skipped += 1
                    continue

                point = Point(lng, lat, srid=4326)  # GEOS is (x=lng, y=lat)
                barangay = self._resolve_barangay(row.get("barangay_code"), point)

                _, was_created = EvacuationCenter.objects.update_or_create(
                    name=name,
                    location=point,
                    defaults={
                        "capacity": _as_int(row.get("capacity")),
                        "contact": (row.get("contact") or "").strip(),
                        "barangay": barangay,
                        "is_active": True,
                    },
                )
                created += was_created
                updated += not was_created

        self.stdout.write(
            self.style.SUCCESS(
                f"Evacuation centers — created {created}, updated {updated}, skipped {skipped}."
            )
        )

    def _resolve_barangay(self, code, point):
        code = (code or "").strip()
        if code:
            return Barangay.objects.filter(code=code).first()
        return Barangay.objects.filter(boundary__contains=point).first()


def _as_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
