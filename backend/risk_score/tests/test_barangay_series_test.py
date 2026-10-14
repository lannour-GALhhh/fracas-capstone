from datetime import datetime, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay
from risk_score.constants import RiskCategory
from risk_score.models import RiskConfig
from risk_score.services.rainfall_csv import CsvError, parse_rainfall_csv
from risk_score.services.series_test import SeriesTestParams, run_series_test

START = datetime(2024, 7, 1, 0)
HIGH_ZONE = {"level": "high", "value": 0.8, "share": 1.0}
SUSCEPTIBILITY = lambda b: {b.id: {"level": "high", "value": 0.8, "zone_count": 1, "zones": [HIGH_ZONE]}}  # noqa: E731


def csv_bytes(rain, mark_index=None, extra_header="", start=START):
    lines = [f"datetime,precipitation_mm,flood{extra_header}"]
    for i, mm in enumerate(rain):
        t = (start + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M")
        lines.append(f"{t},{mm},{1 if i == mark_index else 0}")
    return "\n".join(lines).encode()


def make_barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly))


class ParserTests(SimpleTestCase):
    def test_reads_rain_and_marker(self):
        series = parse_rainfall_csv(csv_bytes([0, 1, 2, 3], mark_index=2))
        self.assertEqual(series.rain_mm, [0, 1, 2, 3])
        self.assertEqual(series.marks, [START + timedelta(hours=2)])

    def test_gap_is_rejected(self):
        raw = b"datetime,precipitation_mm\n2024-07-01T00:00,1\n2024-07-01T02:00,1\n"
        with self.assertRaisesMessage(CsvError, "Missing hour"):
            parse_rainfall_csv(raw)

    def test_missing_rain_column(self):
        with self.assertRaisesMessage(CsvError, "No rainfall column"):
            parse_rainfall_csv(b"datetime,foo\n2024-07-01T00:00,1\n")

    def test_negative_rain_rejected(self):
        with self.assertRaisesMessage(CsvError, "negative"):
            parse_rainfall_csv(b"datetime,precipitation_mm\n2024-07-01T00:00,-1\n")

    def test_filters_multi_barangay_file(self):
        raw = (
            b"barangay,datetime,precipitation_mm\n"
            b"Tumaga,2024-07-01T00:00,1\nPutik,2024-07-01T00:00,9\nTumaga,2024-07-01T01:00,2\n"
        )
        series = parse_rainfall_csv(raw, "tumaga")
        self.assertEqual(series.rain_mm, [1, 2])
        self.assertTrue(series.warnings)

    def test_unknown_barangay_in_multi_barangay_file(self):
        with self.assertRaisesMessage(CsvError, "No rows for"):
            parse_rainfall_csv(b"barangay,datetime,precipitation_mm\nPutik,2024-07-01T00:00,1\n", "Tumaga")

    def test_blank_rain_is_zero_with_warning(self):
        series = parse_rainfall_csv(b"datetime,precipitation_mm\n2024-07-01T00:00,\n")
        self.assertEqual(series.rain_mm, [0.0])
        self.assertTrue(series.warnings)


class RunSeriesTestTests(TestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.susceptibility = SUSCEPTIBILITY(self.barangay)

    def run_test(self, rain, mark_hour, **kw):
        series = parse_rainfall_csv(csv_bytes(rain))
        params = SeriesTestParams(mark=START + timedelta(hours=mark_hour), **kw)
        return run_series_test(self.barangay, series, params, susceptibility=self.susceptibility)

    def test_heavy_rain_before_mark_is_success_with_lead_time(self):
        rain = [0.0] * 30 + [40.0] * 6 + [0.0] * 6  # downpour hours 30-35, mark at hour 36
        out = self.run_test(rain, 36)
        self.assertTrue(out["result"]["success"])
        # Rain has been falling since hour 30, so the first flagged hour in the 4h window is its start.
        self.assertEqual(out["result"]["first_detection_at"], "2024-07-02T08:00")
        self.assertEqual(out["result"]["lead_hours"], 4.0)

    def test_forecast_lookahead_sees_the_storm_early_but_default_does_not(self):
        rain = [0.0] * 36 + [40.0] * 6 + [0.0] * 6  # storm starts exactly at the mark (hour 36)
        causal = self.run_test(rain, 36)
        self.assertTrue(causal["result"]["success"])  # the mark hour itself is in the window
        self.assertEqual(causal["result"]["first_detection_at"], "2024-07-02T12:00")
        peeking = self.run_test(rain, 36, forecast_lookahead=True)
        self.assertEqual(peeking["result"]["first_detection_at"], "2024-07-02T08:00")  # 4h early
        self.assertEqual(peeking["result"]["lead_hours"], 4.0)

    def test_dry_series_is_a_miss(self):
        out = self.run_test([0.0] * 48, 36)
        self.assertFalse(out["result"]["success"])
        self.assertIsNone(out["result"]["lead_hours"])
        self.assertEqual(out["result"]["flagged_hours_outside_window"], 0)

    def test_rain_after_the_window_does_not_count(self):
        rain = [0.0] * 40 + [40.0] * 6 + [0.0] * 2  # storm hits at hour 40, mark at 36
        out = self.run_test(rain, 36)
        self.assertFalse(out["result"]["success"])
        self.assertGreater(out["result"]["flagged_hours_outside_window"], 0)

    def test_window_is_inclusive_of_the_hours_before(self):
        rain = [0.0] * 32 + [40.0] * 4 + [0.0] * 12  # downpour hours 32-35
        self.assertTrue(self.run_test(rain, 36, hours_before=4)["result"]["success"])

    def test_hours_after_extends_the_window(self):
        rain = [0.0] * 38 + [40.0] * 4 + [0.0] * 6
        self.assertFalse(self.run_test(rain, 36)["result"]["success"])
        self.assertTrue(self.run_test(rain, 36, hours_after=4)["result"]["success"])

    def test_warns_when_window_sits_in_the_warmup_hours(self):
        out = self.run_test([40.0] * 12, 8)
        self.assertTrue(any("23 hours" in w for w in out["warnings"]))

    def test_mark_outside_csv_is_an_error(self):
        with self.assertRaises(ValueError):
            self.run_test([0.0] * 10, 50)

    def test_aggregation_override_leaves_the_stored_config_untouched(self):
        config = RiskConfig.objects.create(name="c", is_active=True, zone_aggregation="area_weighted")
        out = self.run_test([0.0] * 30 + [20.0] * 6 + [0.0] * 6, 36, aggregation="max")
        self.assertEqual(out["config"]["aggregation"], "max")
        config.refresh_from_db()
        self.assertEqual(config.zone_aggregation, "area_weighted")

    def test_min_category_raises_the_bar(self):
        rain = [0.0] * 30 + [10.0] * 6 + [0.0] * 6
        self.assertTrue(self.run_test(rain, 36, min_category=RiskCategory.MEDIUM)["result"]["success"])
        self.assertFalse(self.run_test(rain, 36, min_category=RiskCategory.CRITICAL)["result"]["success"])


class BarangaySeriesTestApiTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.url = reverse("barangay-series-test")

    def post(self, rain, **extra):
        payload = {"barangay": self.barangay.id, "file": SimpleUploadedFile("r.csv", rain), **extra}
        with patch(
            "risk_score.services.series_test.dominant_susceptibility_by_barangay",
            return_value=SUSCEPTIBILITY(self.barangay),
        ):
            return self.client.post(self.url, payload, format="multipart")

    def login_admin(self):
        self.client.force_authenticate(get_user_model().objects.create_user("boss", password="pw", is_staff=True))

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(get_user_model().objects.create_user("res", password="pw"))
        self.assertEqual(self.post(csv_bytes([0.0] * 40, 36)).status_code, 403)

    def test_marker_column_drives_the_mark(self):
        self.login_admin()
        rain = [0.0] * 30 + [40.0] * 6 + [0.0] * 6
        resp = self.post(csv_bytes(rain, mark_index=36))
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["result"]["success"])
        self.assertEqual(resp.data["params"]["mark"], "2024-07-02T12:00")

    def test_flood_at_overrides_the_marker(self):
        self.login_admin()
        rain = [0.0] * 30 + [40.0] * 6 + [0.0] * 6
        resp = self.post(csv_bytes(rain, mark_index=0), flood_at="2024-07-02T12:00")
        self.assertEqual(resp.data["params"]["mark"], "2024-07-02T12:00")

    def test_missing_mark_is_a_400(self):
        self.login_admin()
        resp = self.post(csv_bytes([0.0] * 40))
        self.assertEqual(resp.status_code, 400)
        self.assertIn("No flood mark", resp.data["detail"])

    def test_bad_csv_is_a_400(self):
        self.login_admin()
        resp = self.post(b"foo,bar\n1,2\n")
        self.assertEqual(resp.status_code, 400)
