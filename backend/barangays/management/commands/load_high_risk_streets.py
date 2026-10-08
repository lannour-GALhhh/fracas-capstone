"""Detect named streets inside high/very_high flood-susceptibility zones, from OSM Overpass."""

from django.core.management.base import BaseCommand, CommandError

from barangays.importers.streets import StreetDetectionError, detect_high_risk_streets


class Command(BaseCommand):
    help = "Load Street rows (OSM-sourced) for streets crossing high/very_high flood-susceptibility zones."

    def handle(self, *args, **options):
        try:
            result = detect_high_risk_streets()
        except StreetDetectionError as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(
            self.style.SUCCESS(
                f"Loaded {result['streets']} Street row(s) across {result['barangays']} barangay(s) "
                f"(replaced {result['replaced']} existing)."
            )
        )
