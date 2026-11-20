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


def context(susceptibility_by_barangay=None, forecast_horizon=False):
    by_barangay = susceptibility_by_barangay or {}
    return SimpleNamespace(susceptibility_for=lambda b: by_barangay.get(b.id), forecast_horizon=forecast_horizon)


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


def with_far(base, **hours):
    """Add hourly_forecast_5hr..12hr (e.g. h9=20.0) to a rainfall double."""
    for name, value in hours.items():
        setattr(base, f"hourly_forecast_{name[1:]}hr", value)
    return base


class ForecastHorizonTests(SimpleTestCase):
    def value(self, r):
        return RainfallFactor().evaluate(FactorInput(None, r, context(forecast_horizon=True)))

    def test_off_by_default_ignores_far_hours_and_forecast_load(self):
        r = with_far(rainfall(f4=10.0, f1=5.0), h7=30.0)
        off = RainfallFactor().evaluate(FactorInput(None, r, context()))
        self.assertEqual(off.detail["horizon_hours"], 4)
        self.assertEqual(off.detail["forecast_load_mm"], 0.0)
        self.assertGreater(self.value(r).value, off.value)

    def test_far_hours_ignored_when_4th_hour_is_calm(self):
        r = with_far(rainfall(f4=2.0), h6=30.0)
        result = self.value(r)
        self.assertEqual(result.detail["horizon_hours"], 4)
        self.assertEqual(result.detail["peak_intensity_mm_hr"], 2.0)

    def test_flood_like_4th_hour_reads_to_hour_9(self):
        r = with_far(rainfall(f4=10.0), h7=30.0)
        result = self.value(r)
        self.assertEqual(result.detail["horizon_hours"], 9)
        self.assertGreater(result.value, self.value(rainfall(f4=10.0)).value)

    def test_hours_10_to_12_need_both_4th_and_9th_flood_like(self):
        calm_9th = with_far(rainfall(f4=10.0), h9=1.0, h11=40.0)
        self.assertEqual(self.value(calm_9th).detail["horizon_hours"], 9)
        both = with_far(rainfall(f4=10.0), h9=10.0, h11=40.0)
        self.assertEqual(self.value(both).detail["horizon_hours"], 12)

    def test_every_forecast_hour_adds_to_the_load(self):
        steady = self.value(rainfall(f1=5.0, f2=5.0, f3=5.0, f4=5.0))
        single = self.value(rainfall(f1=5.0))
        self.assertGreater(steady.detail["forecast_load_mm"], single.detail["forecast_load_mm"])
        self.assertGreater(steady.value, single.value)

    def test_later_hours_count_less_than_sooner_ones(self):
        soon = self.value(rainfall(f1=8.0))
        later = self.value(rainfall(f4=8.0))
        self.assertGreater(soon.detail["forecast_load_mm"], later.detail["forecast_load_mm"])
