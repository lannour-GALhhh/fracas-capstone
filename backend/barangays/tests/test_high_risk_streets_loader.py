"""Tests for `load_high_risk_streets`. The Overpass HTTP call is mocked
(offline, deterministic) — see CLAUDE.md conventions for this repo's tests."""

from unittest.mock import patch

from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.management import call_command
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


def overpass_response(elements):
    return {"json.return_value": {"elements": elements}, "raise_for_status.return_value": None}


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
        with patch("barangays.management.commands.load_high_risk_streets.requests.post") as mock_post:
            mock_post.return_value.json.return_value = {"elements": elements}
            mock_post.return_value.raise_for_status.return_value = None
            call_command("load_high_risk_streets")
        return mock_post

    def test_only_high_risk_barangay_streets_saved(self):
        elements = [
            {"tags": {"name": "Rizal St"}, "center": {"lat": 6.905, "lon": 122.005}},  # inside high-risk
            {"tags": {"name": "Hilltop Ave"}, "center": {"lat": 6.905, "lon": 122.015}},  # inside low-risk
        ]
        self._run(elements)

        streets = Street.objects.all()
        self.assertEqual(streets.count(), 1)
        street = streets.first()
        self.assertEqual(street.name, "Rizal St")
        self.assertEqual(street.barangay_id, self.high_risk.id)
        self.assertEqual(street.susceptibility_level, "very_high")

    def test_dedupes_repeated_way_segments(self):
        elements = [
            {"tags": {"name": "Rizal St"}, "center": {"lat": 6.902, "lon": 122.002}},
            {"tags": {"name": "Rizal St"}, "center": {"lat": 6.908, "lon": 122.008}},
        ]
        self._run(elements)

        self.assertEqual(Street.objects.filter(name="Rizal St").count(), 1)

    def test_skips_unnamed_or_centerless_ways(self):
        elements = [
            {"tags": {}, "center": {"lat": 6.905, "lon": 122.005}},
            {"tags": {"name": "No Center St"}},
        ]
        self._run(elements)

        self.assertEqual(Street.objects.count(), 0)

    def test_idempotent_rerun(self):
        elements = [{"tags": {"name": "Rizal St"}, "center": {"lat": 6.905, "lon": 122.005}}]
        self._run(elements)
        self._run(elements)

        self.assertEqual(Street.objects.count(), 1)
