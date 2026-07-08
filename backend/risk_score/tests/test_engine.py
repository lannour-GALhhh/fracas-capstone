from django.test import SimpleTestCase

from risk_score.constants import RiskCategory
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


def make_engine(factors):
    # Unsaved RiskConfig picks up default weights/thresholds without a DB.
    return RiskEngine(RiskConfig(name="test"), factors)


class RiskEngineTests(SimpleTestCase):
    def _score(self, factors):
        return make_engine(factors).score(FactorInput(None, None, None))

    def test_all_factors_max_gives_critical(self):
        result = self._score(
            [StubFactor("rainfall", 1.0), StubFactor("susceptibility", 1.0), StubFactor("extra", 1.0)]
        )
        self.assertEqual(result.score, 100.0)
        self.assertEqual(result.category, RiskCategory.CRITICAL)
        self.assertFalse(result.is_degraded)

    def test_unavailable_weight_is_redistributed(self):
        # Only rainfall available at 1.0 -> its weight expands to the whole score.
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

    def test_breakdown_records_every_factor(self):
        result = self._score(
            [StubFactor("rainfall", 0.5), StubFactor("susceptibility", 0.0, available=False)]
        )
        self.assertIn("rainfall", result.breakdown)
        self.assertFalse(result.breakdown["susceptibility"]["available"])


class CategorizeTests(SimpleTestCase):
    def setUp(self):
        self.config = RiskConfig(name="test")

    def test_thresholds(self):
        self.assertEqual(self.config.categorize(24.9), RiskCategory.LOW)
        self.assertEqual(self.config.categorize(25.0), RiskCategory.MEDIUM)
        self.assertEqual(self.config.categorize(50.0), RiskCategory.HIGH)
        self.assertEqual(self.config.categorize(75.0), RiskCategory.CRITICAL)
