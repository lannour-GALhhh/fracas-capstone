from django.test import SimpleTestCase

from risk_score.constants import DEFAULT_THRESHOLDS, RiskCategory
from risk_score.services import fuzzy

T = {c.value: v for c, v in DEFAULT_THRESHOLDS.items()}


class FuzzyTests(SimpleTestCase):
    def test_memberships_sum_to_one(self):
        for s in (0, 12, 25, 33, 48, 50, 61, 75, 90, 100):
            self.assertAlmostEqual(sum(fuzzy.memberships(s, T).values()), 1.0, places=3)

    def test_matches_crisp_boundaries(self):
        cases = {0: "low", 24.9: "low", 25: "medium", 49.9: "medium", 50: "high", 74.9: "high", 75: "critical", 100: "critical"}
        for score, expected in cases.items():
            self.assertEqual(fuzzy.classify(score, T)[0], RiskCategory(expected), score)

    def test_partial_membership_near_boundary(self):
        m = fuzzy.memberships(45, T)
        self.assertAlmostEqual(m["medium"], 0.75, places=2)
        self.assertAlmostEqual(m["high"], 0.25, places=2)
        self.assertEqual(m["low"], 0.0)

    def test_core_is_fully_member(self):
        self.assertEqual(fuzzy.memberships(37.5, T)["medium"], 1.0)
