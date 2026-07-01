from types import SimpleNamespace

from django.test import SimpleTestCase

from risk_score.services.factors import (
    DamFactor,
    ElevationVulnerabilityFactor,
    FactorInput,
    RainfallFactor,
)


def rainfall(current=0.0, f1=0.0, f2=0.0, f3=0.0, f4=0.0, acc24=0.0):
    return SimpleNamespace(
        current_rainfall_strength=current,
        forecast_strength_1hr=f1,
        forecast_strength_2hr=f2,
        forecast_strength_3hr=f3,
        forecast_strength_4hr=f4,
        accumulated_24hr=acc24,
    )


def barangay(height=None, susceptibility=None, downstream=False):
    return SimpleNamespace(
        land_height_mean=height, flood_susceptibility=susceptibility, is_downstream=downstream
    )


def context(bounds=None, dam=None, reading=None):
    return SimpleNamespace(elevation_bounds=bounds, dam=dam, dam_reading=reading)


class RainfallFactorTests(SimpleTestCase):
    def test_peak_intensity_drives_hazard(self):
        result = RainfallFactor().evaluate(FactorInput(None, rainfall(f1=15.0), context()))
        self.assertAlmostEqual(result.value, 0.66)  # 15 mm/hr -> orange band

    def test_accumulation_raises_hazard_without_intensity(self):
        result = RainfallFactor().evaluate(FactorInput(None, rainfall(acc24=200.0), context()))
        self.assertAlmostEqual(result.value, 0.5)  # saturation only

    def test_missing_reading_unavailable(self):
        result = RainfallFactor().evaluate(FactorInput(None, None, context()))
        self.assertFalse(result.available)


class ElevationFactorTests(SimpleTestCase):
    def test_low_lying_more_vulnerable(self):
        ctx = context(bounds=(0.0, 10.0))
        low = ElevationVulnerabilityFactor().evaluate(FactorInput(barangay(height=1.0), None, ctx))
        high = ElevationVulnerabilityFactor().evaluate(FactorInput(barangay(height=9.0), None, ctx))
        self.assertGreater(low.value, high.value)

    def test_susceptibility_blends_in(self):
        ctx = context(bounds=(0.0, 10.0))
        result = ElevationVulnerabilityFactor().evaluate(
            FactorInput(barangay(height=9.0, susceptibility=1.0), None, ctx)
        )
        self.assertAlmostEqual(result.value, 0.55)  # 0.5*0.1 + 0.5*1.0

    def test_missing_elevation_unavailable(self):
        ctx = context(bounds=(0.0, 10.0))
        result = ElevationVulnerabilityFactor().evaluate(FactorInput(barangay(height=None), None, ctx))
        self.assertFalse(result.available)


class DamFactorTests(SimpleTestCase):
    def setUp(self):
        self.dam = SimpleNamespace(normal_level=74.0, critical_level=76.0)
        # At critical, spilling, rising fast -> maximal base + rate.
        self.reading = SimpleNamespace(water_level=76.0, rate_of_change=0.5, is_spilling=True)

    def test_downstream_gets_full_hazard(self):
        ctx = context(dam=self.dam, reading=self.reading)
        result = DamFactor().evaluate(FactorInput(barangay(downstream=True), None, ctx))
        self.assertAlmostEqual(result.value, 1.0)

    def test_upstream_is_attenuated(self):
        ctx = context(dam=self.dam, reading=self.reading)
        down = DamFactor().evaluate(FactorInput(barangay(downstream=True), None, ctx))
        up = DamFactor().evaluate(FactorInput(barangay(downstream=False), None, ctx))
        self.assertLess(up.value, down.value)
        self.assertAlmostEqual(up.value, 0.15)  # UPSTREAM_ATTENUATION

    def test_no_reading_unavailable(self):
        result = DamFactor().evaluate(FactorInput(barangay(downstream=True), None, context(dam=self.dam)))
        self.assertFalse(result.available)
