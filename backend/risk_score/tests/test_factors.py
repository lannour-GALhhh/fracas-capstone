from types import SimpleNamespace

from django.test import SimpleTestCase

from risk_score.services.factors import FactorInput, RainfallFactor, SusceptibilityFactor


def rainfall(current=0.0, f1=0.0, f2=0.0, f3=0.0, f4=0.0, acc24=0.0):
    return SimpleNamespace(
        current_rainfall_strength=current,
        forecast_strength_1hr=f1,
        forecast_strength_2hr=f2,
        forecast_strength_3hr=f3,
        forecast_strength_4hr=f4,
        accumulated_24hr=acc24,
    )


def context(susceptibility_by_barangay=None):
    by_barangay = susceptibility_by_barangay or {}
    return SimpleNamespace(susceptibility_for=lambda b: by_barangay.get(b.id))


class RainfallFactorTests(SimpleTestCase):
    def test_peak_intensity_drives_hazard(self):
        result = RainfallFactor().evaluate(FactorInput(None, rainfall(f1=15.0), context()))
        self.assertAlmostEqual(result.value, 0.55)  # 15 mm/hr -> PAGASA heavy band

    def test_accumulation_raises_hazard_without_intensity(self):
        result = RainfallFactor().evaluate(FactorInput(None, rainfall(acc24=200.0), context()))
        self.assertAlmostEqual(result.value, 0.5)  # saturation only

    def test_missing_reading_unavailable(self):
        result = RainfallFactor().evaluate(FactorInput(None, None, context()))
        self.assertFalse(result.available)


class SusceptibilityFactorTests(SimpleTestCase):
    def test_known_level_returns_value_and_detail(self):
        barangay = SimpleNamespace(id=1)
        levels = {"high": {"area_sqm": 2.0, "share": 1.0}}
        ctx = context({1: {"level": "high", "value": 0.8, "zone_count": 2, "levels": levels}})
        result = SusceptibilityFactor().evaluate(FactorInput(barangay, None, ctx))
        self.assertTrue(result.available)
        self.assertAlmostEqual(result.value, 0.8)
        self.assertEqual(result.detail, {"dominant_level": "high", "zone_count": 2, "levels": levels})

    def test_no_data_unavailable(self):
        barangay = SimpleNamespace(id=1)
        result = SusceptibilityFactor().evaluate(FactorInput(barangay, None, context()))
        self.assertFalse(result.available)
        self.assertEqual(result.value, 0.0)
