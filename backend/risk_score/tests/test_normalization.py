from django.test import SimpleTestCase

from risk_score.services.normalization import (
    clamp,
    normalize_position,
    normalize_rainfall,
    percentile_rank,
    piecewise_linear,
)


class NormalizationTests(SimpleTestCase):
    def test_clamp_bounds(self):
        self.assertEqual(clamp(-1), 0.0)
        self.assertEqual(clamp(2), 1.0)
        self.assertEqual(clamp(0.5), 0.5)

    def test_piecewise_flat_past_ends(self):
        pts = [(0.0, 0.0), (10.0, 1.0)]
        self.assertEqual(piecewise_linear(-5, pts), 0.0)
        self.assertEqual(piecewise_linear(15, pts), 1.0)
        self.assertAlmostEqual(piecewise_linear(5, pts), 0.5)

    def test_normalize_rainfall_pagasa_bands(self):
        # Default curve: steep low end so drizzle barely registers, full hazard
        # at torrential (65 mm/hr). See DEFAULT_RAINFALL_CURVE.
        self.assertEqual(normalize_rainfall(0), 0.0)
        self.assertAlmostEqual(normalize_rainfall(7.5), 0.25)
        self.assertAlmostEqual(normalize_rainfall(15), 0.55)
        self.assertAlmostEqual(normalize_rainfall(30), 0.85)
        self.assertEqual(normalize_rainfall(65), 1.0)
        self.assertEqual(normalize_rainfall(100), 1.0)  # clamped

    def test_normalize_rainfall_custom_curve(self):
        curve = [[0, 0], [10, 1.0]]
        self.assertAlmostEqual(normalize_rainfall(5, curve), 0.5)
        self.assertEqual(normalize_rainfall(20, curve), 1.0)

    def test_normalize_position_degenerate_range(self):
        self.assertEqual(normalize_position(5, 10, 10), 0.0)
        self.assertAlmostEqual(normalize_position(5, 0, 10), 0.5)

    def test_percentile_rank(self):
        pop = [5.0, 10.0, 20.0, 40.0, 100.0]
        self.assertEqual(percentile_rank(5.0, pop), 0.0)     # smallest
        self.assertEqual(percentile_rank(100.0, pop), 1.0)   # largest
        self.assertEqual(percentile_rank(40.0, pop), 0.75)   # 2nd highest
        self.assertEqual(percentile_rank(7.0, []), 0.0)      # empty guard
