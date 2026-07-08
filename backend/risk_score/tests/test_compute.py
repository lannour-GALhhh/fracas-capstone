from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase
from django.utils import timezone

from barangays.models import Barangay, BarangaySusceptibility
from rainfall_fetch.models import Rainfall
from risk_score.models import RiskScore
from risk_score.services import snapshot
from risk_score.tasks import compute_risk_scores


def make_barangay(name, code, height):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name,
        code=code,
        province_code="PH0907332",
        boundary=MultiPolygon(poly),
        land_height_mean=height,
    )


def make_susceptibility(barangay, level="high", source_flood_value=4.0):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return BarangaySusceptibility.objects.create(
        barangay=barangay,
        level=level,
        geom=MultiPolygon(poly),
        geom_simplified=MultiPolygon(poly),
        area_sqm=1.0,
        source_flood_value=source_flood_value,
    )


class ComputeRiskScoresTests(TestCase):
    def test_scores_all_barangays_and_caches_snapshot(self):
        low = make_barangay("Lowland", "L1", height=1.0)
        make_barangay("Highland", "H1", height=100.0)
        Rainfall.objects.create(
            barangay=low, recorded_at=timezone.now(), current_rainfall_strength=30.0
        )

        result = compute_risk_scores()

        self.assertEqual(result["count"], 2)
        self.assertEqual(RiskScore.objects.count(), 2)

        # Every score is flagged degraded because no BarangaySusceptibility fixture
        # is loaded in this test, so the susceptibility factor is unavailable.
        self.assertTrue(all(rs.is_degraded for rs in RiskScore.objects.all()))

        # The rainy lowland barangay must outrank the dry highland one.
        low_score = RiskScore.objects.get(barangay=low).score
        high_score = RiskScore.objects.exclude(barangay=low).get().score
        self.assertGreater(low_score, high_score)

        payload = snapshot.read()
        self.assertIsNotNone(payload)
        self.assertEqual(payload["count"], 2)

    def test_not_degraded_when_both_factors_available(self):
        barangay = make_barangay("Lowland", "L1", height=1.0)
        make_susceptibility(barangay, level="very_high")
        Rainfall.objects.create(
            barangay=barangay, recorded_at=timezone.now(), current_rainfall_strength=30.0
        )

        compute_risk_scores()

        score = RiskScore.objects.get(barangay=barangay)
        self.assertFalse(score.is_degraded)
        self.assertEqual(set(score.breakdown.keys()), {"rainfall", "susceptibility"})
        self.assertTrue(score.breakdown["susceptibility"]["available"])
        self.assertGreater(score.score, 0)
