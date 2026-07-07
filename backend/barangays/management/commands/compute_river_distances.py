"""Compute each barangay's distance to the dam's river corridor.

The dam factor decays a barangay's dam hazard with this distance (zero past the
dam's influence radius), so it must be populated once the dam river geometry is
seeded. Distances are planar metres in UTM 51N (EPSG:32651), which covers
Zamboanga City well enough for a few-km falloff.

    python manage.py compute_river_distances
"""

from django.contrib.gis.db.models.functions import Distance, Transform
from django.core.management.base import BaseCommand

from barangays.models import Barangay
from dam_level.models import Dam

UTM_51N = 32651  # metric projection for Zamboanga City


class Command(BaseCommand):
    help = "Populate Barangay.distance_to_river_km from the dam's river geometry."

    def handle(self, *args, **options):
        dam = Dam.objects.exclude(river__isnull=True).first()
        if dam is None or dam.river is None:
            self.stderr.write(
                self.style.WARNING(
                    "No dam river geometry found — run migrations/seed first. Nothing to do."
                )
            )
            return

        river_utm = dam.river.transform(UTM_51N, clone=True)

        # One query: distance from each boundary to the river, both in UTM metres.
        annotated = Barangay.objects.annotate(
            river_distance=Distance(Transform("boundary", UTM_51N), river_utm)
        )

        updated = 0
        for barangay in annotated:
            barangay.distance_to_river_km = round(barangay.river_distance.m / 1000.0, 4)
            barangay.save(update_fields=["distance_to_river_km"])
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(f"Set distance_to_river_km on {updated} barangay(s).")
        )
