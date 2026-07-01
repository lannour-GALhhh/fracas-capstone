"""Import recorded flood events from a CSV (validation ground truth).

CSV columns (header required):
    barangay      barangay name (or use `code` for the PSGC code)
    occurred_at   ISO datetime, e.g. 2024-07-15T14:00  (date-only -> local noon)
    severity      minor | moderate | major   (default moderate)
    water_depth_m optional float
    source        optional text
    notes         optional text

    python manage.py load_flood_events path/to/flood_events.csv

See flood_events/fixtures/flood_events_sample.csv for the format.
"""

import csv
from datetime import datetime, time

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from barangays.models import Barangay
from flood_events.models import FloodEvent, FloodSeverity


def parse_occurred_at(raw: str):
    raw = (raw or "").strip()
    dt = parse_datetime(raw)
    if dt is None:
        d = parse_date(raw)
        dt = datetime.combine(d, time(12, 0)) if d else None
    if dt is None:
        return None
    return timezone.make_aware(dt) if timezone.is_naive(dt) else dt


class Command(BaseCommand):
    help = "Import recorded flood events from a CSV."

    def add_arguments(self, parser):
        parser.add_argument("csv_path")

    def handle(self, *args, **options):
        try:
            with open(options["csv_path"], newline="") as fh:
                rows = list(csv.DictReader(fh))
        except OSError as exc:
            raise CommandError(f"Cannot read CSV: {exc}")

        created, skipped = 0, []
        for row in rows:
            barangay = self._match(row)
            occurred_at = parse_occurred_at(row.get("occurred_at", ""))
            if barangay is None or occurred_at is None:
                skipped.append(row.get("barangay") or row.get("code") or "?")
                continue
            severity = (row.get("severity") or FloodSeverity.MODERATE).strip().lower()
            if severity not in FloodSeverity.values:
                severity = FloodSeverity.MODERATE
            FloodEvent.objects.create(
                barangay=barangay,
                occurred_at=occurred_at,
                severity=severity,
                water_depth_m=_float_or_none(row.get("water_depth_m")),
                source=(row.get("source") or "").strip(),
                notes=(row.get("notes") or "").strip(),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Imported {created} flood event(s)."))
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {len(skipped)}: {', '.join(skipped)}"))

    @staticmethod
    def _match(row) -> Barangay | None:
        code = (row.get("code") or "").strip()
        if code:
            return Barangay.objects.filter(code=code).first()
        name = (row.get("barangay") or "").strip()
        return Barangay.objects.filter(name__iexact=name).first() if name else None


def _float_or_none(raw):
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None
