from types import SimpleNamespace

from django.test import SimpleTestCase

from risk_score.constants import (
    COMBINATION_RAINFALL_GATED,
    COMBINATION_WEIGHTED_SUM,
    ZONE_AGG_MAX,
    RiskCategory,
)
from risk_score.models import RiskConfig
from risk_score.services.engine import RiskEngine
from risk_score.services.factors import FactorInput, FactorResult


class StubFactor:
    def __init__(self, key, value, available=True):
        self.key = key
        self._value = value
        self._available = available

    def evaluate(self, data):
        return FactorResult(self.key, self._value, available=self._available)


def weighted_engine(factors):
    # Unsaved RiskConfig; force the legacy additive mode for these tests.
    return RiskEngine(RiskConfig(name="test", combination_mode=COMBINATION_WEIGHTED_SUM), factors)


class WeightedSumTests(SimpleTestCase):
    def _score(self, factors):
        return weighted_engine(factors).score(FactorInput(None, None, None))

    def test_all_factors_max_gives_critical(self):
        result = self._score(
            [StubFactor("rainfall", 1.0), StubFactor("susceptibility", 1.0), StubFactor("extra", 1.0)]
        )
        self.assertEqual(result.score, 100.0)
        self.assertEqual(result.category, RiskCategory.CRITICAL)
        self.assertFalse(result.is_degraded)

    def test_unavailable_weight_is_redistributed(self):
        result = self._score(
            [
                StubFactor("rainfall", 1.0),
                StubFactor("susceptibility", 0.0, available=False),
                StubFactor("extra", 0.0, available=False),
            ]
        )
        self.assertEqual(result.score, 100.0)
        self.assertTrue(result.is_degraded)

    def test_no_available_factors_is_zero(self):
        result = self._score([StubFactor("rainfall", 1.0, available=False)])
        self.assertEqual(result.score, 0.0)
        self.assertEqual(result.category, RiskCategory.LOW)
        self.assertTrue(result.is_degraded)


def gated_engine(factors, **cfg):
    return RiskEngine(RiskConfig(name="test", combination_mode=COMBINATION_RAINFALL_GATED, **cfg), factors)


def gated_input(rainfall_value, rainfall_available, zones):
    """FactorInput whose context yields the given susceptibility zones."""
    context = SimpleNamespace(
        rainfall_curve=None,
        accumulation_curve=None,
        zones_for=lambda b: zones,
    )
    return FactorInput(barangay=SimpleNamespace(id=1), rainfall=None, context=context)


class RainfallGatedTests(SimpleTestCase):
    def _score(self, rainfall_value, zones, available=True, **cfg):
        engine = gated_engine([StubFactor("rainfall", rainfall_value, available=available)], **cfg)
        return engine.score(gated_input(rainfall_value, available, zones))

    def test_no_rain_gives_zero_despite_high_susceptibility(self):
        # The core bug fix: a very-high susceptibility barangay with zero rain
        # must score ~0, not ~50.
        result = self._score(0.0, [{"level": "very_high", "value": 1.0, "share": 1.0}])
        self.assertEqual(result.score, 0.0)
        self.assertEqual(result.category, RiskCategory.LOW)

    def test_strong_rain_high_susceptibility_is_critical(self):
        result = self._score(1.0, [{"level": "very_high", "value": 1.0, "share": 1.0}])
        self.assertEqual(result.score, 100.0)
        self.assertEqual(result.category, RiskCategory.CRITICAL)

    def test_zone_scores_are_rain_times_susceptibility(self):
        result = self._score(
            0.5,
            [
                {"level": "very_high", "value": 1.0, "share": 0.5},
                {"level": "very_low", "value": 0.2, "share": 0.5},
            ],
        )
        zones = {z["level"]: z for z in result.breakdown["zones"]}
        self.assertEqual(zones["very_high"]["score"], 50.0)  # 0.5 * 1.0 * 100
        self.assertAlmostEqual(zones["very_low"]["score"], 10.0)  # 0.5 * 0.2 * 100
        # Equal shares -> area-weighted average equals the simple mean -> 30.
        self.assertAlmostEqual(result.score, 30.0)

    def test_area_weighted_is_default_and_weights_by_share(self):
        # 90% of the land is very-low, 10% very-high. The area-weighted default
        # must pull the barangay score toward the dominant zone (not the mean).
        result = self._score(
            1.0,
            [
                {"level": "very_high", "value": 1.0, "share": 0.1},
                {"level": "very_low", "value": 0.2, "share": 0.9},
            ],
        )
        # 1.0*0.1 + 0.2*0.9 = 0.28 -> 28 (a simple mean would be 60).
        self.assertAlmostEqual(result.score, 28.0)
        self.assertEqual(result.breakdown["aggregation"], "area_weighted")

    def test_max_aggregation_takes_worst_zone(self):
        result = self._score(
            0.5,
            [
                {"level": "very_high", "value": 1.0, "share": 0.5},
                {"level": "very_low", "value": 0.2, "share": 0.5},
            ],
            zone_aggregation=ZONE_AGG_MAX,
        )
        self.assertAlmostEqual(result.score, 50.0)

    def test_susceptibility_matters_more_as_rain_grows(self):
        zones = [
            {"level": "very_high", "value": 1.0, "share": 0.5},
            {"level": "very_low", "value": 0.2, "share": 0.5},
        ]
        light = self._score(0.2, zones)
        heavy = self._score(0.9, zones)
        spread_light = max(z["score"] for z in light.breakdown["zones"]) - min(
            z["score"] for z in light.breakdown["zones"]
        )
        spread_heavy = max(z["score"] for z in heavy.breakdown["zones"]) - min(
            z["score"] for z in heavy.breakdown["zones"]
        )
        self.assertGreater(spread_heavy, spread_light)

    def test_missing_rainfall_is_degraded_zero(self):
        result = self._score(0.0, [{"level": "very_high", "value": 1.0, "share": 1.0}], available=False)
        self.assertEqual(result.score, 0.0)
        self.assertTrue(result.is_degraded)

    def test_no_zones_falls_back_to_rain_only_degraded(self):
        result = self._score(0.6, [])
        self.assertAlmostEqual(result.score, 60.0)
        self.assertTrue(result.is_degraded)


class CategorizeTests(SimpleTestCase):
    def setUp(self):
        self.config = RiskConfig(name="test")

    def test_thresholds(self):
        self.assertEqual(self.config.categorize(24.9), RiskCategory.LOW)
        self.assertEqual(self.config.categorize(25.0), RiskCategory.MEDIUM)
        self.assertEqual(self.config.categorize(50.0), RiskCategory.HIGH)
        self.assertEqual(self.config.categorize(75.0), RiskCategory.CRITICAL)
