from types import SimpleNamespace

from django.test import SimpleTestCase

from risk_score.services.factors import FactorInput, RainfallFactor, SusceptibilityFactor


def rainfall(current=0.0, f1=0.0, f2=0.0, f3=0.0, f4=0.0, acc24=0.0, acc6=0.0):
    return SimpleNamespace(
        hourly_current=current,
        hourly_forecast_1hr=f1,
        hourly_forecast_2hr=f2,
        hourly_forecast_3hr=f3,
        hourly_forecast_4hr=f4,
        current_rainfall_strength=current,
        forecast_strength_15min=0.0,
        forecast_strength_30min=0.0,
        forecast_strength_45min=0.0,
        forecast_strength_60min=f1,
        forecast_strength_75min=0.0,
        forecast_strength_90min=0.0,
        forecast_strength_105min=0.0,
        forecast_strength_120min=f2,
        forecast_strength_135min=0.0,
        forecast_strength_150min=0.0,
        forecast_strength_165min=0.0,
        forecast_strength_180min=f3,
        forecast_strength_195min=0.0,
        forecast_strength_210min=0.0,
        forecast_strength_225min=0.0,
        forecast_strength_240min=f4,
        accumulated_6hr=acc6,
        accumulated_24hr=acc24,
    )


def context(susceptibility_by_barangay=None):
    by_barangay = susceptibility_by_barangay or {}
    return SimpleNamespace(susceptibility_for=lambda b: by_barangay.get(b.id))


class RainfallFactorTests(SimpleTestCase):
    def test_peak_intensity_drives_hazard(self):
        result = RainfallFactor().evaluate(FactorInput(None, rainfall(f1=15.0), context()))
        self.assertAlmostEqual(result.value, 0.55)  # 15 mm/hr -> PAGASA heavy band

    def test_saturation_alone_is_gated_by_intensity(self):
        # 60 mm/24h is fully saturated, but with no rain falling the gate closes it.
        result = RainfallFactor().evaluate(FactorInput(None, rainfall(acc24=60.0), context()))
        self.assertAlmostEqual(result.value, 0.0)

    def test_saturation_lingers_after_a_storm_then_fades(self):
        # Rain just stopped: 30 mm fell in the last 6 h (5 mm/h mean), 40 mm in 24 h.
        just_after = RainfallFactor().evaluate(FactorInput(None, rainfall(acc6=30.0, acc24=40.0), context()))
        self.assertAlmostEqual(just_after.value, 0.9 * (5.0 / 6.0))
        # Six hours on the 6 h window has emptied, so the gate closes.
        later = RainfallFactor().evaluate(FactorInput(None, rainfall(acc6=0.0, acc24=40.0), context()))
        self.assertAlmostEqual(later.value, 0.0)

    def test_steady_drizzle_cannot_reach_high(self):
        # 2 mm/h for a day = 48 mm/24h: saturation 0.9 * gate (2/6) = 0.3 -> MEDIUM at worst.
        result = RainfallFactor().evaluate(FactorInput(None, rainfall(current=2.0, acc24=48.0), context()))
        self.assertLess(result.value, 0.5)
        self.assertGreater(result.value, 0.25)

    def test_heavy_rain_on_wet_ground_is_extreme(self):
        # 20 mm/h on 60 mm/24h: intensity 0.7 vs full saturation 1.0 (gate fully open).
        result = RainfallFactor().evaluate(FactorInput(None, rainfall(current=20.0, acc24=60.0), context()))
        self.assertAlmostEqual(result.value, 1.0)
        self.assertEqual(result.detail["saturation_gate"], 1.0)

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
