"""Seed a few demo flood hotspots so the advisory overlay has something to show.

Placeholder frequent-flooding spots in Zamboanga City; the barangay is resolved
by point-in-polygon. Idempotent on the hotspot name.

    python manage.py seed_demo_hotspots
"""

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand

from barangays.models import Barangay
from poi.models import FloodHotspot

# (name, latitude, longitude, radius_m, severity, description)
DEMO_HOTSPOTS = [
    ("Tumaga River Bend", 6.9300, 122.0810, 400, "high", "Overflows when the dam spills."),
    ("Guiwan Junction", 6.9080, 122.0870, 300, "medium", "Clogged drainage floods the road."),
    ("Sta. Maria Lowland", 6.8990, 122.0705, 350, "medium", "Low-lying; ponds after heavy rain."),
    ("Canelar Creek Mouth", 6.9105, 122.0745, 250, "high", "Tidal backflow meets creek runoff."),
]


class Command(BaseCommand):
    help = "Create demo flood hotspots for the GIS/mobile advisory overlay."

    def handle(self, *args, **options):
        created = updated = 0
        for name, lat, lng, radius, severity, description in DEMO_HOTSPOTS:
            point = Point(lng, lat, srid=4326)
            barangay = Barangay.objects.filter(boundary__contains=point).first()
            _, was_created = FloodHotspot.objects.update_or_create(
                name=name,
                defaults={
                    "location": point,
                    "radius_m": radius,
                    "severity": severity,
                    "description": description,
                    "barangay": barangay,
                    "is_active": True,
                },
            )
            created += was_created
            updated += not was_created

        self.stdout.write(
            self.style.SUCCESS(f"Demo flood hotspots: {created} created, {updated} updated.")
        )
