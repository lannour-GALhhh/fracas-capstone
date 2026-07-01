"""Import per-barangay flood-susceptibility ratings from a CSV.

Populate `Barangay.flood_susceptibility` (0-1) from a hazard map such as
Project NOAH / HazardHunterPH. The vulnerability factor already blends this in.

CSV columns (header required): one of `code` or `name`, plus `susceptibility`.
`susceptibility` may be numeric (0-1) or categorical:
    low=0.25, moderate/medium=0.5, high=0.75, very high=1.0

    python manage.py load_susceptibility path/to/susceptibility.csv
"""

import csv

from django.core.management.base import BaseCommand, CommandError

from barangays.models import Barangay

CATEGORICAL = {
    "low": 0.25,
    "moderate": 0.5,
    "medium": 0.5,
    "high": 0.75,
    "veryhigh": 1.0,
}


def parse_susceptibility(raw: str) -> float | None:
    raw = (raw or "").strip()
    if not raw:
        return None
    try:
        return max(0.0, min(1.0, float(raw)))
    except ValueError:
        return CATEGORICAL.get(raw.lower().replace(" ", "").replace("_", ""))


class Command(BaseCommand):
    help = "Import barangay flood-susceptibility ratings from a CSV."

    def add_arguments(self, parser):
        parser.add_argument("csv_path")

    def handle(self, *args, **options):
        try:
            with open(options["csv_path"], newline="") as fh:
                rows = list(csv.DictReader(fh))
        except OSError as exc:
            raise CommandError(f"Cannot read CSV: {exc}")

        updated, skipped = 0, []
        for row in rows:
            score = parse_susceptibility(row.get("susceptibility", ""))
            barangay = self._match(row)
            if barangay is None or score is None:
                skipped.append(row.get("code") or row.get("name") or "?")
                continue
            barangay.flood_susceptibility = score
            barangay.save(update_fields=["flood_susceptibility"])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} barangay susceptibility value(s)."))
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {len(skipped)}: {', '.join(skipped)}"))

    @staticmethod
    def _match(row) -> Barangay | None:
        code = (row.get("code") or "").strip()
        if code:
            return Barangay.objects.filter(code=code).first()
        name = (row.get("name") or "").strip()
        return Barangay.objects.filter(name__iexact=name).first() if name else None
