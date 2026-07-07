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


def barangay(height=None, susceptibility=None, downstream=False, distance_to_river_km=None):
    return SimpleNamespace(
        land_height_mean=height,
        flood_susceptibility=susceptibility,
        is_downstream=downstream,
        distance_to_river_km=distance_to_river_km,
    )


def context(elevations=None, dam=None, reading=None):
    return SimpleNamespace(sorted_elevations=elevations or [], dam=dam, dam_reading=reading)


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
    # A population where 5.0 is the lowest and 100.0 an outlier "mountain".
    POP = [5.0, 10.0, 20.0, 40.0, 100.0]

    def test_low_lying_more_vulnerable(self):
        ctx = context(elevations=self.POP)
        low = ElevationVulnerabilityFactor().evaluate(FactorInput(barangay(height=5.0), None, ctx))
        high = ElevationVulnerabilityFactor().evaluate(FactorInput(barangay(height=100.0), None, ctx))
        self.assertEqual(low.value, 1.0)   # lowest -> full vulnerability
        self.assertEqual(high.value, 0.0)  # highest -> none

    def test_outlier_does_not_saturate_mid_barangay(self):
        # 40m is the 2nd-highest of 5 -> rank 0.75 -> vulnerability 0.25,
        # not near-1 as raw min-max would give against the 100m outlier.
        ctx = context(elevations=self.POP)
        result = ElevationVulnerabilityFactor().evaluate(FactorInput(barangay(height=40.0), None, ctx))
        self.assertAlmostEqual(result.value, 0.25)

    def test_susceptibility_blends_in(self):
        ctx = context(elevations=self.POP)
        # height 100 -> elevation_vuln 0.0; blended 50/50 with susceptibility 1.0
        result = ElevationVulnerabilityFactor().evaluate(
            FactorInput(barangay(height=100.0, susceptibility=1.0), None, ctx)
        )
        self.assertAlmostEqual(result.value, 0.5)

    def test_missing_elevation_unavailable(self):
        ctx = context(elevations=self.POP)
        result = ElevationVulnerabilityFactor().evaluate(FactorInput(barangay(height=None), None, ctx))
        self.assertFalse(result.available)


class DamFactorTests(SimpleTestCase):
    def setUp(self):
        self.dam = SimpleNamespace(normal_level=74.0, critical_level=76.0, influence_radius_km=8.0)
        # At critical, spilling, rising fast -> maximal base + rate.
        self.reading = SimpleNamespace(water_level=76.0, rate_of_change=0.5, is_spilling=True)

    # --- fallback path (distance not yet computed): coarse downstream flag ---
    def test_downstream_gets_full_hazard(self):
        ctx = context(dam=self.dam, reading=self.reading)
        result = DamFactor().evaluate(FactorInput(barangay(downstream=True), None, ctx))
        self.assertAlmostEqual(result.value, 1.0)

    def test_upstream_is_attenuated(self):
        ctx = context(dam=self.dam, reading=self.reading)
        down = DamFactor().evaluate(FactorInput(barangay(downstream=True), None, ctx))
        up = DamFactor().evaluate(FactorInput(barangay(downstream=False), None, ctx))
        self.assertLess(up.value, down.value)
        self.assertAlmostEqual(up.value, 0.15)  # FALLBACK_UPSTREAM_SHARE

    # --- distance-decay path: hazard fades to zero past the influence radius ---
    def test_on_river_gets_full_hazard(self):
        ctx = context(dam=self.dam, reading=self.reading)
        result = DamFactor().evaluate(FactorInput(barangay(distance_to_river_km=0.0), None, ctx))
        self.assertAlmostEqual(result.value, 1.0)

    def test_half_radius_halves_hazard(self):
        ctx = context(dam=self.dam, reading=self.reading)
        result = DamFactor().evaluate(FactorInput(barangay(distance_to_river_km=4.0), None, ctx))
        self.assertAlmostEqual(result.value, 0.5)

    def test_beyond_radius_is_zero(self):
        ctx = context(dam=self.dam, reading=self.reading)
        far = DamFactor().evaluate(FactorInput(barangay(distance_to_river_km=12.0), None, ctx))
        self.assertAlmostEqual(far.value, 0.0)

    def test_distance_overrides_downstream_flag(self):
        # A "downstream" barangay far from the river still decays to near-zero.
        ctx = context(dam=self.dam, reading=self.reading)
        result = DamFactor().evaluate(
            FactorInput(barangay(downstream=True, distance_to_river_km=8.0), None, ctx)
        )
        self.assertAlmostEqual(result.value, 0.0)

    def test_no_reading_unavailable(self):
        result = DamFactor().evaluate(FactorInput(barangay(downstream=True), None, context(dam=self.dam)))
        self.assertFalse(result.available)
