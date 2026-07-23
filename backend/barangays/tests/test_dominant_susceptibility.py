from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase

from barangays.models import Barangay, BarangaySusceptibility
from barangays.services import dominant_susceptibility_by_barangay

SQUARE = MultiPolygon(Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0))))


def make_barangay(name, code):
    return Barangay.objects.create(name=name, code=code, province_code="PH0907332", boundary=SQUARE)


def make_zone(barangay, level):
    return BarangaySusceptibility.objects.create(
        barangay=barangay,
        level=level,
        geom=SQUARE,
        geom_simplified=SQUARE,
        area_sqm=1.0,
        source_flood_value=1.0,
    )


class DominantSusceptibilityTests(TestCase):
    def test_multiple_levels_take_the_max(self):
        barangay = make_barangay("Multi", "M1")
        make_zone(barangay, "low")
        make_zone(barangay, "very_high")
        make_zone(barangay, "moderate")

        result = dominant_susceptibility_by_barangay()

        self.assertEqual(result[barangay.id]["level"], "very_high")
        self.assertEqual(result[barangay.id]["value"], 1.0)
        self.assertEqual(result[barangay.id]["zone_count"], 3)
        # Each zone is 1.0 sqm here, so an even three-way split.
        levels = result[barangay.id]["levels"]
        self.assertEqual(list(levels), ["very_high", "moderate", "low"])  # most severe first
        self.assertAlmostEqual(levels["very_high"]["share"], 1 / 3)
        self.assertAlmostEqual(levels["moderate"]["share"], 1 / 3)
        self.assertAlmostEqual(levels["low"]["share"], 1 / 3)

    def test_single_level_is_that_level(self):
        barangay = make_barangay("Single", "S1")
        make_zone(barangay, "moderate")

        result = dominant_susceptibility_by_barangay()

        self.assertEqual(
            result[barangay.id],
            {
                "level": "moderate",
                "value": 0.6,
                "zone_count": 1,
                "zones": [{"level": "moderate", "value": 0.6, "area_sqm": 1.0, "share": 1.0}],
                "levels": {"moderate": {"area_sqm": 1.0, "share": 1.0}},
            },
        )

    def test_no_zones_is_absent_not_zero(self):
        barangay = make_barangay("Empty", "E1")

        result = dominant_susceptibility_by_barangay()

        self.assertNotIn(barangay.id, result)
