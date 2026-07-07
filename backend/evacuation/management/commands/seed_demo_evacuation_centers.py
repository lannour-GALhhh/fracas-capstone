"""Seed a handful of demo evacuation centers so the map has markers to show.

Coordinates are approximate placeholders within Zamboanga City; the barangay is
resolved by point-in-polygon. Idempotent on the center name.

    python manage.py seed_demo_evacuation_centers
"""

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand

from barangays.models import Barangay
from evacuation.models import EvacuationCenter

# (name, latitude, longitude, capacity, contact)
DEMO_CENTERS = [
    ("Zamboanga City High School (Main)", 6.9126, 122.0790, 800, "DRRMO 09171234567"),
    ("Don Pablo Lorenzo Memorial HS", 6.9050, 122.0760, 500, "DRRMO 09171234568"),
    ("WMSU Gymnasium", 6.9130, 122.0630, 1200, "DRRMO 09171234569"),
    ("Tetuan Central School", 6.9200, 122.0850, 600, "DRRMO 09171234570"),
    ("Sta. Maria Gymnasium", 6.9000, 122.0700, 400, "DRRMO 09171234571"),
    ("Tumaga Covered Court", 6.9350, 122.0800, 350, "DRRMO 09171234572"),
]


class Command(BaseCommand):
    help = "Create demo evacuation centers for the GIS/mobile map."

    def handle(self, *args, **options):
        created = updated = 0
        for name, lat, lng, capacity, contact in DEMO_CENTERS:
            point = Point(lng, lat, srid=4326)
            barangay = Barangay.objects.filter(boundary__contains=point).first()
            _, was_created = EvacuationCenter.objects.update_or_create(
                name=name,
                defaults={
                    "location": point,
                    "capacity": capacity,
                    "contact": contact,
                    "barangay": barangay,
                    "is_active": True,
                },
            )
            created += was_created
            updated += not was_created

        self.stdout.write(
            self.style.SUCCESS(f"Demo evacuation centers: {created} created, {updated} updated.")
        )
