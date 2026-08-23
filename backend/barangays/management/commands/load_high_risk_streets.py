"""Load named streets located inside high/very_high flood-susceptibility
barangays, sourced from OpenStreetMap's Overpass API.

One Overpass query fetches every named `highway` way in Zamboanga City's
bounding box (with each way's center point, not its full geometry — cheap and
enough for barangay assignment). Each point is then tested against the
boundaries of barangays whose dominant susceptibility
(`barangays.services.dominant_susceptibility_by_barangay`) is high/very_high;
matches are stored as `Street` rows, deduped by (barangay, name).

Full delete+recreate each run, wrapped in a single transaction.

    python manage.py load_high_risk_streets
"""

import requests
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from barangays.models import Barangay, Street
from barangays.services import dominant_susceptibility_by_barangay

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HIGH_RISK_LEVELS = {"high", "very_high"}
REQUEST_TIMEOUT_S = 180
# Overpass's usage policy requires an identifying User-Agent; requests without
# one (or with the bare python-requests default) get a 406 from its Apache
# front end regardless of query validity.
REQUEST_HEADERS = {"User-Agent": "FRACAS-FloodEarlyWarning/1.0 (Zamboanga City; github.com/GetALifehahaha/FRACAS)"}


def _bbox(barangays):
    south = min(b.boundary.extent[1] for b in barangays)
    west = min(b.boundary.extent[0] for b in barangays)
    north = max(b.boundary.extent[3] for b in barangays)
    east = max(b.boundary.extent[2] for b in barangays)
    return south, west, north, east


def _overpass_query(south, west, north, east) -> str:
    return (
        f"[out:json][timeout:{REQUEST_TIMEOUT_S}];"
        f'way["highway"]["name"]({south},{west},{north},{east});'
        "out tags center;"
    )


class Command(BaseCommand):
    help = "Load Street rows (OSM-sourced) for barangays whose dominant flood susceptibility is high/very_high."

    def handle(self, *args, **options):
        dominant = dominant_susceptibility_by_barangay()
        high_risk_ids = [bid for bid, info in dominant.items() if info["level"] in HIGH_RISK_LEVELS]
        if not high_risk_ids:
            raise CommandError("No high/very_high susceptibility barangays found — run load_flood_susceptibility first.")

        high_risk_barangays = list(Barangay.objects.filter(id__in=high_risk_ids))
        south, west, north, east = _bbox(high_risk_barangays)

        self.stdout.write(f"Querying Overpass for named highways in ({south:.4f},{west:.4f},{north:.4f},{east:.4f})...")
        try:
            response = requests.post(
                OVERPASS_URL,
                data={"data": _overpass_query(south, west, north, east)},
                headers=REQUEST_HEADERS,
                timeout=REQUEST_TIMEOUT_S,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise CommandError(f"Overpass request failed: {exc}") from exc

        elements = response.json().get("elements", [])
        self.stdout.write(f"Received {len(elements)} way(s) from Overpass. Assigning to barangays...")

        seen = {}  # (barangay_id, name) -> Street(unsaved)
        unmatched = 0
        for element in elements:
            name = element.get("tags", {}).get("name")
            center = element.get("center")
            if not name or not center:
                continue
            point = Point(center["lon"], center["lat"], srid=4326)

            barangay = next((b for b in high_risk_barangays if b.boundary.contains(point)), None)
            if barangay is None:
                unmatched += 1
                continue

            key = (barangay.id, name)
            if key not in seen:
                seen[key] = Street(
                    name=name,
                    barangay=barangay,
                    susceptibility_level=dominant[barangay.id]["level"],
                )

        with transaction.atomic():
            deleted, _ = Street.objects.all().delete()
            Street.objects.bulk_create(seen.values())

        self.stdout.write(
            self.style.SUCCESS(
                f"Loaded {len(seen)} Street row(s) across {len(high_risk_barangays)} high-risk barangay(s) "
                f"(replaced {deleted} existing). {unmatched} way(s) fell outside all high-risk barangays."
            )
        )
