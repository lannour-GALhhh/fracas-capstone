from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import SimpleTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from rainfall_fetch.models import Rainfall
from rainfall_fetch.tasks import _accumulate, parse_rainfall_data


class AccumulateTests(SimpleTestCase):
    def test_window_sum(self):
        precip = [1, 2, 3, 4, 5, 6, 7, 8]
        self.assertEqual(_accumulate(precip, 7, 3), 21)  # 6 + 7 + 8

    def test_window_clamps_at_start(self):
        precip = [1, 2, 3, 4]
        self.assertEqual(_accumulate(precip, 2, 6), 6)  # only 1 + 2 + 3 available


class ParseRainfallTests(SimpleTestCase):
    def _payload(self):
        times = [f"2026-07-01T{h:02d}:00" for h in range(0, 8)]
        precip = [1, 1, 1, 1, 10, 2, 3, 4]  # current hour = index 4 (04:00)
        quarter_times = [
            f"2026-07-01T{h:02d}:{m:02d}" for h in range(0, 8) for m in (0, 15, 30, 45)
        ]
        quarter_precip = list(range(len(quarter_times)))  # current 15-min bucket = index 16 (04:00)
        return {
            "current": {"time": "2026-07-01T04:00", "precipitation": 10},
            "hourly": {"time": times, "precipitation": precip},
            "minutely_15": {"time": quarter_times, "precipitation": quarter_precip},
        }

    def test_parses_intensity_and_accumulation(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["current_rainfall_strength"], 10)
        self.assertEqual(result["forecast_strength_60min"], 20)  # index 16 + 4
        self.assertEqual(result["accumulated_6hr"], 14)  # indices 0..4 -> 1+1+1+1+10
        self.assertEqual(result["accumulated_24hr"], 14)
        self.assertEqual(result["accumulated_7day"], 14)  # only 5 hours of history available

    def test_parses_quarter_hour_forecasts(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["forecast_strength_15min"], 17)  # index 16 + 1
        self.assertEqual(result["forecast_strength_30min"], 18)  # index 16 + 2
        self.assertEqual(result["forecast_strength_45min"], 19)  # index 16 + 3
        self.assertEqual(result["forecast_strength_90min"], 22)  # index 16 + 6
        self.assertEqual(result["forecast_strength_150min"], 26)  # index 16 + 10
        self.assertEqual(result["forecast_strength_210min"], 30)  # index 16 + 14
        self.assertEqual(result["forecast_strength_240min"], 0)  # index 16 + 16 -> out of range

    def test_missing_current_hour_defaults_to_zero(self):
        data = self._payload()
        data["current"]["time"] = "2026-07-01T23:00"  # not in hourly or minutely_15 times
        result = parse_rainfall_data(data)
        self.assertEqual(result["accumulated_24hr"], 0)
        self.assertEqual(result["accumulated_7day"], 0)
        self.assertEqual(result["current_rainfall_strength"], 0)
        self.assertEqual(result["forecast_strength_30min"], 0)


def make_barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly),
    )


class RainfallHistoryApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(self.user)
        self.barangay = make_barangay()
        # Anchor to a clean hour boundary, away from midnight, so small offsets
        # land in predictable hour/day buckets regardless of wall-clock time.
        self.now = timezone.now().replace(hour=12, minute=0, second=0, microsecond=0)

    def _reading(self, offset, strength):
        Rainfall.objects.create(
            barangay=self.barangay,
            current_rainfall_strength=strength,
            recorded_at=self.now - offset,
        )

    def test_requires_barangay_param(self):
        resp = self.client.get(reverse("rainfall-history"))
        self.assertEqual(resp.status_code, 400)

    def test_aggregates_per_hour_within_window(self):
        self._reading(timedelta(hours=1), 4)         # HH-1:00 bucket
        self._reading(timedelta(minutes=45), 8)      # HH-1:15 -> same HH-1:00 bucket, higher peak
        self._reading(timedelta(hours=2), 2)         # HH-2:00 bucket
        self._reading(timedelta(days=10), 20)        # outside the default 7-day window

        resp = self.client.get(reverse("rainfall-history"), {"barangay": self.barangay.id})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)  # only the two recent hour buckets

        earlier, later = resp.data[0], resp.data[1]  # ascending by hour
        self.assertEqual(earlier["peak_mm_hr"], 2)
        self.assertEqual(later["peak_mm_hr"], 8)
        self.assertEqual(later["accumulated_mm"], 3.0)  # (4 + 8) * 0.25
        # Timestamped to the hour boundary, not a raw 15-minute reading time.
        self.assertTrue(later["recorded_at"].endswith(":00:00+00:00") or later["recorded_at"].endswith(":00:00"))

    def test_days_param_widens_window(self):
        self._reading(timedelta(days=10), 20)
        resp = self.client.get(reverse("rainfall-history"), {"barangay": self.barangay.id, "days": 14})
        self.assertEqual(len(resp.data), 1)

    def test_day_granularity_aggregates_per_calendar_day(self):
        self._reading(timedelta(hours=1), 4)          # today
        self._reading(timedelta(hours=5), 8)           # today, higher peak
        self._reading(timedelta(days=1, hours=2), 2)   # yesterday

        resp = self.client.get(
            reverse("rainfall-history"),
            {"barangay": self.barangay.id, "granularity": "day"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)  # two distinct calendar days

        yesterday, today = resp.data[0], resp.data[1]  # ascending by day
        self.assertEqual(yesterday["peak_mm_hr"], 2)
        self.assertEqual(today["peak_mm_hr"], 8)
        self.assertEqual(today["accumulated_mm"], 3.0)  # (4 + 8) * 0.25
        self.assertEqual(len(today["recorded_at"]), 10)  # date-only, e.g. 2026-09-19
