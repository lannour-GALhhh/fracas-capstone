"""Analytics endpoint tests — deterministic and offline.

Uses a local-memory cache (not Redis) and clears it per test so cached
per-window payloads never leak between cases.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay, BarangaySusceptibility
from flood_events.models import FloodEvent
from rainfall_fetch.models import Rainfall
from risk_score.constants import RiskCategory
from risk_score.models import RiskScore, ValidationRun

SQUARE = MultiPolygon(Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0))))


def make_barangay(name, code, **kwargs):
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=SQUARE, **kwargs
    )


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
)
class AnalyticsApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.operator = get_user_model().objects.create_user(
            "op", password="pw", is_operator=True
        )
        self.resident = get_user_model().objects.create_user("res", password="pw")
        self.now = timezone.now()
        self.brgy_a = make_barangay("Tumaga", "A1")
        self.brgy_b = make_barangay("Guiwan", "B1")
        BarangaySusceptibility.objects.create(
            barangay=self.brgy_a, level="very_high", geom=SQUARE, geom_simplified=SQUARE,
            area_sqm=1.0, source_flood_value=5.0,
        )
        self.client.force_authenticate(self.operator)

    # --- helpers ---------------------------------------------------------
    def _score(self, brgy, category, days_ago=1):
        RiskScore.objects.create(
            barangay=brgy, score=80.0, category=category,
            computed_at=self.now - timedelta(days=days_ago),
        )

    def _flood(self, brgy, days_ago=1, people=100, **kwargs):
        return FloodEvent.objects.create(
            barangay=brgy, occurred_at=self.now - timedelta(days=days_ago),
            people_affected=people, **kwargs,
        )

    # --- auth gate -------------------------------------------------------
    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("analytics-summary")).status_code, 401)

    def test_resident_forbidden(self):
        self.client.force_authenticate(self.resident)
        self.assertEqual(self.client.get(reverse("analytics-hotspots")).status_code, 403)

    # --- window clamping -------------------------------------------------
    def test_window_clamped_and_defaulted(self):
        # An old score falls outside a 1-day window but inside the 30-day default.
        self._score(self.brgy_a, RiskCategory.CRITICAL, days_ago=10)
        inside = self.client.get(reverse("analytics-hotspots"))  # default 30d
        self.assertEqual(len(inside.data), 1)
        outside = self.client.get(reverse("analytics-hotspots"), {"days": 1})
        self.assertEqual(len(outside.data), 0)
        # Garbage + over-max both resolve to a valid window (no 500).
        self.assertEqual(
            self.client.get(reverse("analytics-hotspots"), {"days": "abc"}).status_code, 200
        )
        self.assertEqual(
            self.client.get(reverse("analytics-hotspots"), {"days": 9999}).status_code, 200
        )

    # --- hotspots --------------------------------------------------------
    def test_hotspots_rank_by_critical_cycles(self):
        for _ in range(3):
            self._score(self.brgy_a, RiskCategory.CRITICAL)
        self._score(self.brgy_b, RiskCategory.CRITICAL)
        self._score(self.brgy_b, RiskCategory.HIGH)
        resp = self.client.get(reverse("analytics-hotspots"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data[0]["barangay_name"], "Tumaga")
        self.assertEqual(resp.data[0]["critical_cycles"], 3)
        self.assertEqual(resp.data[0]["dominant_level"], "very_high")
        self.assertEqual(resp.data[1]["high_cycles"], 1)

    def test_hotspots_excludes_deleted_and_unconfirmed_floods(self):
        self._score(self.brgy_a, RiskCategory.CRITICAL)
        self._flood(self.brgy_a, people=50)  # confirmed, counts
        self._flood(self.brgy_a, people=99, is_confirmed=False)  # excluded
        self._flood(self.brgy_a, people=99, deleted_at=self.now)  # excluded
        resp = self.client.get(reverse("analytics-hotspots"))
        row = resp.data[0]
        self.assertEqual(row["flood_count"], 1)
        self.assertEqual(row["people_affected"], 50)

    def test_hotspots_omits_quiet_barangays(self):
        # brgy_a only ever LOW; it should not appear on the leaderboard.
        self._score(self.brgy_a, RiskCategory.LOW)
        self.assertEqual(len(self.client.get(reverse("analytics-hotspots")).data), 0)

    # --- rainfall timeline ----------------------------------------------
    def test_rainfall_timeline_buckets_and_events(self):
        Rainfall.objects.create(
            barangay=self.brgy_a, accumulated_24hr=40.0,
            recorded_at=self.now - timedelta(days=1),
        )
        Rainfall.objects.create(
            barangay=self.brgy_b, accumulated_24hr=60.0,
            recorded_at=self.now - timedelta(days=1),
        )
        self._flood(self.brgy_a)
        resp = self.client.get(reverse("analytics-rainfall-timeline"))
        self.assertEqual(resp.data["granularity"], "day")  # 30d default
        self.assertEqual(len(resp.data["series"]), 1)
        self.assertEqual(resp.data["series"][0]["avg_24h"], 50.0)
        self.assertEqual(resp.data["series"][0]["max_24h"], 60.0)
        self.assertEqual(len(resp.data["events"]), 1)
        # Short windows switch to hourly buckets.
        self.assertEqual(
            self.client.get(reverse("analytics-rainfall-timeline"), {"days": 7}).data[
                "granularity"
            ],
            "hour",
        )

    # --- summary ---------------------------------------------------------
    def test_summary_blends_window_and_current_state(self):
        self._flood(self.brgy_a, people=100)
        self._flood(self.brgy_a, people=50, is_confirmed=False)  # excluded
        # AlertState rows drive current high/critical counts.
        from alert.models import AlertState

        AlertState.objects.create(barangay=self.brgy_a, level=RiskCategory.CRITICAL)
        AlertState.objects.create(barangay=self.brgy_b, level=RiskCategory.HIGH)
        resp = self.client.get(reverse("analytics-summary"))
        self.assertEqual(resp.data["flood_events"], 1)
        self.assertEqual(resp.data["people_affected"], 100)
        self.assertEqual(resp.data["barangays_critical"], 1)
        self.assertEqual(resp.data["barangays_high"], 1)

    # --- model performance ----------------------------------------------
    def test_model_performance_only_done_runs_oldest_first(self):
        ValidationRun.objects.create(status=ValidationRun.Status.DONE, recall=0.5, mean_score=40)
        ValidationRun.objects.create(status=ValidationRun.Status.DONE, recall=0.8, mean_score=60)
        ValidationRun.objects.create(status=ValidationRun.Status.RUNNING)
        resp = self.client.get(reverse("analytics-model-performance"))
        self.assertEqual(len(resp.data), 2)
        self.assertEqual(resp.data[0]["recall"], 0.5)  # oldest first
        self.assertEqual(resp.data[1]["recall"], 0.8)
