from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import override_settings, SimpleTestCase, TestCase
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

    def test_parses_amounts_as_mm_per_15_minutes(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["current_rainfall_strength"], 10)  # mm per 15 min, not scaled
        self.assertEqual(result["forecast_strength_60min"], 20)  # index 16 + 4
        self.assertNotIn("accumulated_6hr", result)  # accumulations come from stored hourly rows

    def test_parses_quarter_hour_forecasts(self):
        result = parse_rainfall_data(self._payload())
        self.assertEqual(result["forecast_strength_15min"], 17)  # index 16 + 1
        self.assertEqual(result["forecast_strength_30min"], 18)  # index 16 + 2
        self.assertEqual(result["forecast_strength_45min"], 19)  # index 16 + 3
        self.assertEqual(result["forecast_strength_90min"], 22)  # index 16 + 6
        self.assertEqual(result["forecast_strength_150min"], 26)  # index 16 + 10
        self.assertEqual(result["forecast_strength_210min"], 30)  # index 16 + 14
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
    """Every barangay is queried at its own centroid; grid cells are not shared."""

    def test_each_barangay_gets_its_own_query_point_even_if_a_grid_cell_is_shared(self):
        b1 = make_barangay("Alpha", "A1")
        b2 = make_barangay("Beta", "B1")
        BarangayRainfallGrid.objects.create(barangay=b1, grid_lat=7.0, grid_lon=122.0)
        BarangayRainfallGrid.objects.create(barangay=b2, grid_lat=7.0, grid_lon=122.0)

        barangays = list(Barangay.objects.all())
        groups = _query_groups(barangays)

        self.assertEqual(len(groups), 2)
        for group in groups:
            self.assertEqual(len(group["members"]), 1)
            centroid = group["members"][0].boundary.centroid
            self.assertEqual((group["lat"], group["lon"]), (centroid.y, centroid.x))


class FetchPerBarangayTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    @patch("rainfall_fetch.tasks.requests.get")
    def test_one_query_point_and_one_reading_per_barangay(self, mock_get):
        for i, name in enumerate(["Alpha", "Beta", "Gamma"]):
            make_barangay(name, f"C{i}")
        mock_get.return_value.raise_for_status.return_value = None
        mock_get.return_value.json.return_value = _mock_forecast_payload(3)

        fetch_rainfall_information()

        # One HTTP call carries hourly + minutely_15 for all three barangays.
        self.assertEqual(mock_get.call_count, 1)
        url = mock_get.call_args_list[0].args[0]
        self.assertIn("minutely_15", url)
        self.assertIn("hourly=precipitation", url)
        self.assertEqual(len(url.split("latitude=")[1].split("&")[0].split(",")), 3)
        self.assertEqual(Rainfall.objects.count(), 3)

    @patch("rainfall_fetch.tasks.requests.get")
    def test_fetches_at_most_once_per_30_minutes(self, mock_get):
        make_barangay()
        mock_get.return_value.raise_for_status.return_value = None
        mock_get.return_value.json.return_value = _mock_forecast_payload(1)

        fetch_rainfall_information()
        fetch_rainfall_information()  # next pipeline run: too soon
        self.assertEqual(mock_get.call_count, 1)

        Rainfall.objects.update(recorded_at=timezone.now() - timedelta(minutes=30))
        fetch_rainfall_information()
        self.assertEqual(mock_get.call_count, 2)


class HourlyInputsTests(SimpleTestCase):
    def test_hourly_inputs_come_from_the_hourly_series_not_the_15_minute_steps(self):
        from rainfall_fetch.tasks import hourly_inputs

        hour = _this_hour()
        stamp = lambda k: (hour + timedelta(hours=k)).strftime("%Y-%m-%dT%H:%M")
        data = {"hourly": {"time": [stamp(k) for k in range(0, 5)], "precipitation": [0.2, 0.1, 0.3, None, 1.5]}}

        self.assertEqual(
            hourly_inputs(data, hour),
            {"hourly_current": 0.2, "hourly_forecast_1hr": 0.1, "hourly_forecast_2hr": 0.3,
             "hourly_forecast_3hr": 0, "hourly_forecast_4hr": 1.5},
        )
        self.assertEqual(hourly_inputs({"hourly": {"time": [], "precipitation": []}}, hour)["hourly_current"], 0)


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
    def test_nothing_is_dropped_by_default(self):
        data = {
            "current": {"time": "2026-07-01T00:00", "precipitation": 0.1},
            "minutely_15": {"time": ["2026-07-01T00:00", "2026-07-01T00:15"], "precipitation": [0.1, 0.1]},
        }
        result = parse_rainfall_data(data)
        self.assertEqual(result["current_rainfall_strength"], 0.1)  # mm per 15 min, as reported
        self.assertEqual(result["forecast_strength_15min"], 0.1)

    @override_settings(RAINFALL_NOISE_FLOOR_MM_HR=0.5)
    def test_a_configured_floor_still_zeroes_trace_amounts(self):
        data = {
            "current": {"time": "2026-07-01T00:00", "precipitation": 0.4},
            "minutely_15": {"time": ["2026-07-01T00:00", "2026-07-01T00:15"], "precipitation": [0.4, 0.5]},
        }
        result = parse_rainfall_data(data)
        self.assertEqual(result["current_rainfall_strength"], 0)
        self.assertEqual(result["forecast_strength_15min"], 0.5)

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
        Rainfall.objects.update(recorded_at=timezone.now() - timedelta(minutes=30))
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


class GridMappingTests(TestCase):
    """Grid mapping is no longer used by the fetch; the reset helper still works."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    def test_model_switch_drops_the_mapping(self):
        from rainfall_fetch.services.grid import reset_grid_mapping

        b = make_barangay("Alpha", "A1")
        BarangayRainfallGrid.objects.create(barangay=b, grid_lat=7.0, grid_lon=122.0)
        reset_grid_mapping()
        self.assertEqual(BarangayRainfallGrid.objects.count(), 0)


class CallBudgetTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    def test_counts_one_call_per_location_and_blocks_past_the_limit(self):
        from django.test import override_settings
        from rainfall_fetch.services import budget

        self.assertEqual(budget.locations_in("https://x/v1/forecast?latitude=1,2,3&longitude=4,5,6"), 3)
        with override_settings(RAINFALL_DAILY_CALL_LIMIT=10):
            budget.record(8)
            self.assertTrue(budget.can_spend(2))
            self.assertFalse(budget.can_spend(3))

    def test_headroom_flags_a_cell_count_that_leaves_no_room_to_retry(self):
        from django.test import override_settings
        from rainfall_fetch.services import budget

        with override_settings(RAINFALL_DAILY_CALL_LIMIT=8000):
            self.assertEqual(budget.runs_per_day(), 48)  # fetched every 30 min
            self.assertTrue(budget.has_retry_headroom(100))  # 4,800/day
            self.assertFalse(budget.has_retry_headroom(150))  # 7,200/day: no room for retries

    @patch("rainfall_fetch.tasks.requests.get")
    def test_fetch_stops_when_the_daily_limit_is_reached(self, mock_get):
        from django.test import override_settings
        from rainfall_fetch.services import budget

        b = make_barangay("Alpha", "A1")
        BarangayRainfallGrid.objects.create(barangay=b, grid_lat=7.0, grid_lon=122.0)
        with override_settings(RAINFALL_DAILY_CALL_LIMIT=5):
            budget.record(5)
            fetch_rainfall_information()

        mock_get.assert_not_called()


class RainfallGridViewTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        User = get_user_model()
        self.admin = User.objects.create_user("gridadmin", password="pw", is_staff=True)
        self.url = reverse("admin-settings-rainfall-grid")

    def test_requires_admin(self):
        self.assertIn(self.client.get(self.url).status_code, (401, 403))

    def test_get_reports_dedup_and_usage(self):
        a, b = make_barangay("Alpha", "A1"), make_barangay("Beta", "B1")
        BarangayRainfallGrid.objects.create(barangay=a, grid_lat=7.0, grid_lon=122.0)
        BarangayRainfallGrid.objects.create(barangay=b, grid_lat=7.0, grid_lon=122.0)
        self.client.force_authenticate(self.admin)

        data = self.client.get(self.url).json()

        self.assertEqual((data["barangays"], data["mapped"], data["cells"]), (2, 2, 1))
        self.assertEqual(data["expected_daily_calls"], 96)  # 2 barangays x 48
        self.assertTrue(data["has_retry_headroom"])

    @patch("rainfall_fetch.settings_views.ensure_grid_mapping", return_value=(2, []))
    def test_post_remaps_and_audits(self, remap):
        from audit.models import ConfigChangeLog

        self.client.force_authenticate(self.admin)
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 200)
        remap.assert_called_once_with(remap=True)
        self.assertEqual(response.json()["failed"], [])
        self.assertTrue(ConfigChangeLog.objects.filter(action="remapped grid").exists())
