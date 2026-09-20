"""Regenerate the hazard-zone display geometry (`geom_simplified`) from the authoritative `geom`."""

from django.core.management.base import BaseCommand

from barangays.geometry import rebuild_simplified_geometry


class Command(BaseCommand):
    help = "Rebuild BarangaySusceptibility.geom_simplified from geom (map-display generalization)."

    def handle(self, *args, **options):
        updated = rebuild_simplified_geometry()
        self.stdout.write(
            self.style.SUCCESS(f"Rebuilt geom_simplified for {updated} zone(s).")
        )
