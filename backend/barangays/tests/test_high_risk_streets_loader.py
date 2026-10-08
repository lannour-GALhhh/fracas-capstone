"""Tests for `load_high_risk_streets`. The Overpass HTTP call is mocked."""

from unittest.mock import patch

from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.management import CommandError, call_command
from django.test import TestCase

from barangays.constants import SusceptibilityLevel
from barangays.models import Barangay, BarangaySusceptibility, Street


def make_barangay(name, code, coords):
    poly = Polygon(coords)
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


def make_susceptibility(barangay, level, coords, flood_value=1.0):
    poly = Polygon(coords)
    return BarangaySusceptibility.objects.create(
        barangay=barangay,
        level=level,
        geom=MultiPolygon(poly),
        geom_simplified=MultiPolygon(poly),
        area_sqm=1000.0,
        source_flood_value=flood_value,
    )


class HighRiskStreetsLoaderTests(TestCase):
    # Two adjacent ~1km squares.
    HIGH_RISK_SQUARE = [(122.00, 6.90), (122.00, 6.91), (122.01, 6.91), (122.01, 6.90), (122.00, 6.90)]
    LOW_RISK_SQUARE = [(122.01, 6.90), (122.01, 6.91), (122.02, 6.91), (122.02, 6.90), (122.01, 6.90)]

    def setUp(self):
        self.high_risk = make_barangay("Flood Alley", "H1", self.HIGH_RISK_SQUARE)
        make_susceptibility(self.high_risk, SusceptibilityLevel.VERY_HIGH, self.HIGH_RISK_SQUARE)

        self.low_risk = make_barangay("Dry Hill", "L1", self.LOW_RISK_SQUARE)
        make_susceptibility(self.low_risk, SusceptibilityLevel.LOW, self.LOW_RISK_SQUARE)

    def _run(self, elements):
        with patch("barangays.importers.streets.fetch_named_ways", return_value=elements) as fetch:
            call_command("load_high_risk_streets")
        return fetch

    @staticmethod
    def way(name, *lonlats):
        return {"tags": {"name": name}, "geometry": [{"lon": lon, "lat": lat} for lon, lat in lonlats]}

    def test_only_streets_in_high_risk_zones_saved(self):
        self._run([
            self.way("Rizal St", (122.002, 6.905), (122.008, 6.905)),  # inside high-risk zone
            self.way("Hilltop Ave", (122.012, 6.905), (122.018, 6.905)),  # inside low-risk zone
        ])

        street = Street.objects.get()
        self.assertEqual(street.name, "Rizal St")
        self.assertEqual(street.barangay_id, self.high_risk.id)
        self.assertEqual(street.susceptibility_level, "very_high")

    def test_street_crossing_into_risky_zone_is_saved(self):
        self._run([self.way("Border Rd", (122.008, 6.905), (122.015, 6.905))])

        self.assertEqual(Street.objects.get().name, "Border Rd")

    def test_dedupes_repeated_way_segments(self):
        self._run([
            self.way("Rizal St", (122.002, 6.902), (122.004, 6.902)),
            self.way("Rizal St", (122.006, 6.908), (122.008, 6.908)),
        ])

        self.assertEqual(Street.objects.filter(name="Rizal St").count(), 1)

    def test_skips_unnamed_or_geometryless_ways(self):
        self._run([
            {"tags": {}, "geometry": [{"lon": 122.002, "lat": 6.905}, {"lon": 122.004, "lat": 6.905}]},
            {"tags": {"name": "No Geometry St"}},
        ])

        self.assertEqual(Street.objects.count(), 0)

    def test_idempotent_rerun(self):
        elements = [self.way("Rizal St", (122.002, 6.905), (122.008, 6.905))]
        self._run(elements)
        self._run(elements)

        self.assertEqual(Street.objects.count(), 1)

    def test_requires_susceptibility_data(self):
        BarangaySusceptibility.objects.all().delete()

        with self.assertRaises(CommandError):
            self._run([])
