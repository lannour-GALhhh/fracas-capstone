from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from rainfall_fetch.models import BarangayRainfallGrid, HourlyRainfall, Rainfall, RainfallSettings
from rainfall_fetch.tasks import (
    _accumulations, _hour_total, _query_groups, fetch_rainfall_information, parse_rainfall_data,
)


class ParseRainfallTests(SimpleTestCase):
    def _payload(self):
        quarter_times = [
            f"2026-07-01T{h:02d}:{m:02d}" for h in range(0, 8) for m in (0, 15, 30, 45)
        ]
        quarter_precip = list(range(len(quarter_times)))  # current 15-min bucket = index 16 (04:00)
        return {
            "current": {"time": "2026-07-01T04:00", "precipitation": 10},
            "minutely_15": {"time": quarter_times, "precipitation": quarter_precip},
        }

    def test_parses_intensity_as_mm_per_hour(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["current_rainfall_strength"], 40)  # 10 mm/15min -> 40 mm/hr
        self.assertEqual(result["forecast_strength_60min"], 80)  # index 16 + 4 -> 20 mm/15min
        self.assertNotIn("accumulated_6hr", result)  # accumulations come from stored hourly rows

    def test_parses_quarter_hour_forecasts(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["forecast_strength_15min"], 68)  # index 16 + 1
        self.assertEqual(result["forecast_strength_30min"], 72)  # index 16 + 2
        self.assertEqual(result["forecast_strength_45min"], 76)  # index 16 + 3
        self.assertEqual(result["forecast_strength_90min"], 88)  # index 16 + 6
        self.assertEqual(result["forecast_strength_150min"], 104)  # index 16 + 10
        self.assertEqual(result["forecast_strength_210min"], 120)  # index 16 + 14
        self.assertEqual(result["forecast_strength_240min"], 0)  # index 16 + 16 -> out of range

    def test_missing_current_time_defaults_to_zero(self):
        data = self._payload()
        data["current"]["time"] = "2026-07-01T23:00"  # not in minutely_15 times
        result = parse_rainfall_data(data)
        self.assertEqual(result["current_rainfall_strength"], 0)
        self.assertEqual(result["forecast_strength_30min"], 0)


def make_barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly),
    )


def _this_hour():
    return timezone.now().replace(minute=0, second=0, microsecond=0)


def _mock_forecast_payload(n, hour_total=5):
    """One Open-Meteo response object per queried location."""
    payload = {
        "current": {"time": "2026-07-01T04:00", "precipitation": 5},
        "minutely_15": {"time": ["2026-07-01T04:00"], "precipitation": [5]},
        "hourly": {"time": [_this_hour().strftime("%Y-%m-%dT%H:%M")], "precipitation": [hour_total]},
    }
    return [dict(payload) for _ in range(n)]


class QueryGroupsTests(TestCase):
    """`_query_groups` must dedup by the *discovered* grid cell (BarangayRainfallGrid),
    never by an assumed geographic distance."""

    def test_barangays_sharing_a_discovered_grid_cell_are_grouped_together(self):
        b1 = make_barangay("Alpha", "A1")
        b2 = make_barangay("Beta", "B1")
        BarangayRainfallGrid.objects.create(barangay=b1, grid_lat=7.0, grid_lon=122.0)
        BarangayRainfallGrid.objects.create(barangay=b2, grid_lat=7.0, grid_lon=122.0)

        barangays = list(Barangay.objects.select_related("rainfall_grid").all())
        groups = _query_groups(barangays)

        self.assertEqual(len(groups), 1)
        self.assertCountEqual([b.name for b in groups[0]["members"]], ["Alpha", "Beta"])
        self.assertEqual((groups[0]["lat"], groups[0]["lon"]), (7.0, 122.0))

    def test_barangays_in_different_discovered_cells_stay_separate(self):
        b1 = make_barangay("Alpha", "A1")
        b2 = make_barangay("Beta", "B1")
        BarangayRainfallGrid.objects.create(barangay=b1, grid_lat=7.0, grid_lon=122.0)
        BarangayRainfallGrid.objects.create(barangay=b2, grid_lat=7.1, grid_lon=122.1)

        barangays = list(Barangay.objects.select_related("rainfall_grid").all())
        groups = _query_groups(barangays)

        self.assertEqual(len(groups), 2)

    def test_undiscovered_barangay_falls_back_to_its_own_centroid(self):
        make_barangay("Undiscovered", "U1")

        barangays = list(Barangay.objects.select_related("rainfall_grid").all())
        groups = _query_groups(barangays)

        self.assertEqual(len(groups), 1)
        self.assertEqual(len(groups[0]["members"]), 1)
        # Falls back to the barangay's own centroid, not a guessed/shared point.
        centroid = barangays[0].boundary.centroid
        self.assertEqual((groups[0]["lat"], groups[0]["lon"]), (centroid.y, centroid.x))


class FetchRainfallDedupTests(TestCase):
    """Barangays sharing a discovered grid cell must be fetched with a single
    Open-Meteo query, not one query per barangay."""

    @patch("rainfall_fetch.tasks.requests.get")
    def test_shared_grid_cell_is_queried_once_but_stores_a_reading_per_barangay(self, mock_get):
        b1 = make_barangay("Alpha", "A1")
        b2 = make_barangay("Beta", "B1")
        b3 = make_barangay("Gamma", "G1")
        BarangayRainfallGrid.objects.create(barangay=b1, grid_lat=7.0, grid_lon=122.0)
        BarangayRainfallGrid.objects.create(barangay=b2, grid_lat=7.0, grid_lon=122.0)
        # Gamma left undiscovered on purpose -> queried separately via its own centroid.

        mock_get.return_value.raise_for_status.return_value = None
        mock_get.return_value.json.return_value = _mock_forecast_payload(2)

        fetch_rainfall_information()

        # Two distinct query points went out (the shared cell + Gamma's own centroid),
        # not three -- and a single (minutely) HTTP call, since history is stored locally.
        self.assertEqual(mock_get.call_count, 1)
        self.assertNotIn("past_days", mock_get.call_args_list[0].args[0])
        queried_url = mock_get.call_args_list[0].args[0]
        latitude_param = queried_url.split("latitude=")[1].split("&")[0]
        self.assertEqual(len(latitude_param.split(",")), 2)  # 2 query points, not 3

        # But every barangay still gets its own stored reading.
        self.assertEqual(Rainfall.objects.count(), 3)
        self.assertEqual(Rainfall.objects.filter(barangay=b1).count(), 1)
        self.assertEqual(Rainfall.objects.filter(barangay=b2).count(), 1)
        self.assertEqual(Rainfall.objects.filter(barangay=b3).count(), 1)


class AccumulationTests(TestCase):
    def test_sums_trailing_windows_from_stored_hours(self):
        b = make_barangay()
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        for age, mm in [(0, 1.0), (5, 2.0), (6, 4.0), (23, 8.0), (24, 16.0), (100, 32.0)]:
            HourlyRainfall.objects.create(barangay=b, hour=now - timedelta(hours=age), precipitation=mm)

        acc = _accumulations([b.id], now)[b.id]

        self.assertEqual(acc["accumulated_6hr"], 3.0)   # ages 0..5
        self.assertEqual(acc["accumulated_12hr"], 7.0)  # + age 6
        self.assertEqual(acc["accumulated_24hr"], 15.0)  # + age 23
        self.assertEqual(acc["accumulated_7day"], 63.0)  # everything

    def test_no_history_is_zero(self):
        b = make_barangay()
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        self.assertEqual(_accumulations([b.id], now)[b.id]["accumulated_24hr"], 0)


class NoiseFloorTests(SimpleTestCase):
    def test_trace_intensity_is_zeroed_after_conversion_to_mm_per_hour(self):
        data = {
            "current": {"time": "2026-07-01T00:00", "precipitation": 0.4},  # 1.6 mm/hr: drizzle
            "minutely_15": {"time": ["2026-07-01T00:00", "2026-07-01T00:15"], "precipitation": [0.4, 0.5]},
        }
        result = parse_rainfall_data(data)
        self.assertEqual(result["current_rainfall_strength"], 0)
        self.assertEqual(result["forecast_strength_15min"], 2.0)  # 0.5 mm/15min = 2 mm/hr, at the floor

    def test_heavy_rain_is_scaled_not_flattened(self):
        data = {
            "current": {"time": "2026-07-01T00:00", "precipitation": 5.0},
            "minutely_15": {"time": ["2026-07-01T00:00"], "precipitation": [5.0]},
        }
        self.assertEqual(parse_rainfall_data(data)["current_rainfall_strength"], 20.0)

    def test_hour_total_matched_by_hour_label_and_not_scaled(self):
        hour = _this_hour()
        label = hour.strftime("%Y-%m-%dT%H:%M")
        self.assertEqual(_hour_total({"hourly": {"time": [label], "precipitation": [1.7]}}, hour), 1.7)
        self.assertIsNone(_hour_total({"hourly": {"time": ["1999-01-01T00:00"], "precipitation": [9]}}, hour))


class HourlyRecordingTests(TestCase):
    def _run(self, mock_get, precipitation):
        mock_get.return_value.raise_for_status.return_value = None
        payload = _mock_forecast_payload(1, hour_total=precipitation)
        mock_get.return_value.json.return_value = payload
        fetch_rainfall_information()

    @patch("rainfall_fetch.tasks.requests.get")
    def test_records_on_the_hour_and_first_reading_wins(self, mock_get):
        b = make_barangay()
        self._run(mock_get, 5)
        self._run(mock_get, 9)  # later run, same hour: must not overwrite

        row = HourlyRainfall.objects.get(barangay=b)
        self.assertEqual((row.hour.minute, row.hour.second), (0, 0))
        self.assertEqual(row.precipitation, 5)
        self.assertEqual(Rainfall.objects.filter(barangay=b).count(), 2)
        self.assertEqual(Rainfall.objects.filter(barangay=b).first().accumulated_6hr, 5)

    @patch("rainfall_fetch.tasks.requests.get")
    def test_stores_hourly_total_not_the_15_minute_current_value(self, mock_get):
        b = make_barangay()
        mock_get.return_value.raise_for_status.return_value = None
        payload = _mock_forecast_payload(1, hour_total=1.7)
        payload[0]["current"]["precipitation"] = 0.4  # last 15 min only
        mock_get.return_value.json.return_value = payload
        fetch_rainfall_information()
        self.assertEqual(HourlyRainfall.objects.get(barangay=b).precipitation, 1.7)

    @patch("rainfall_fetch.tasks.requests.get")
    def test_response_without_the_hour_does_not_claim_it(self, mock_get):
        b = make_barangay()
        mock_get.return_value.raise_for_status.return_value = None
        payload = _mock_forecast_payload(1)
        payload[0]["hourly"]["time"] = ["1999-01-01T00:00"]
        mock_get.return_value.json.return_value = payload
        fetch_rainfall_information()
        self.assertFalse(HourlyRainfall.objects.filter(barangay=b).exists())


class RainfallHistoryApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(self.user)
        self.barangay = make_barangay()
        # Anchor to a clean hour boundary for predictable bucketing.
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


class RainfallModelParamTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    """The admin-selected weather model is passed to Open-Meteo as `models=`."""

    def _fetched_url(self, mock_get):
        make_barangay("Alpha", "A1")
        mock_get.return_value.raise_for_status.return_value = None
        mock_get.return_value.json.return_value = _mock_forecast_payload(1)
        fetch_rainfall_information()
        return mock_get.call_args_list[0].args[0]

    @patch("rainfall_fetch.tasks.requests.get")
    def test_default_sends_no_models_param(self, mock_get):
        self.assertNotIn("models=", self._fetched_url(mock_get))

    @patch("rainfall_fetch.tasks.requests.get")
    def test_ecmwf_is_requested_when_selected(self, mock_get):
        settings_row = RainfallSettings.get_solo()
        settings_row.weather_model = RainfallSettings.WeatherModel.ECMWF
        settings_row.save()
        self.assertIn("&models=ecmwf_ifs025", self._fetched_url(mock_get))


class RainfallSettingsApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        User = get_user_model()
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.resident = User.objects.create_user("resident", password="pw")
        self.url = reverse("admin-settings-rainfall")

    def test_resident_forbidden(self):
        self.client.force_authenticate(self.resident)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_invalid_model_rejected(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(self.url, {"weather_model": "gfs"}, format="json")
        self.assertEqual(resp.status_code, 400)

    @patch("risk_score.tasks.run_scoring_pipeline.delay")
    def test_switching_model_reruns_pipeline_and_resets_current_hour(self, mock_delay):
        barangay = make_barangay("Alpha", "A1")
        HourlyRainfall.objects.create(barangay=barangay, hour=_this_hour(), precipitation=9)
        old_hour = _this_hour() - timedelta(hours=1)
        HourlyRainfall.objects.create(barangay=barangay, hour=old_hour, precipitation=3)
        self.client.force_authenticate(self.admin)

        with self.captureOnCommitCallbacks(execute=True):
            resp = self.client.patch(self.url, {"weather_model": "ecmwf_ifs025"}, format="json")

        self.assertEqual(resp.status_code, 200)
        mock_delay.assert_called_once()
        self.assertFalse(HourlyRainfall.objects.filter(hour=_this_hour()).exists())
        self.assertTrue(HourlyRainfall.objects.filter(hour=old_hour).exists())

    @patch("risk_score.tasks.run_scoring_pipeline.delay")
    def test_unchanged_model_does_not_rerun(self, mock_delay):
        self.client.force_authenticate(self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.patch(self.url, {"weather_model": "default"}, format="json")
        mock_delay.assert_not_called()
