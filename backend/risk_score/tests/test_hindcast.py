from datetime import datetime, timedelta

from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from barangays.models import Barangay
from risk_score.services.hindcast import hindcast_score, reconstruct_rainfall


def hourly_series(when, hours_before=24, hours_after=5, value=1.0, spike=None):
    """Build an Open-Meteo-style hourly block centered on `when`."""
    base = when - timedelta(hours=hours_before)
    times, precip = [], []
    for h in range(hours_before + hours_after + 1):
        t = base + timedelta(hours=h)
        times.append(t.strftime("%Y-%m-%dT%H:%M"))
        precip.append(spike if (spike is not None and t.hour == when.hour) else value)
    return {"hourly": {"time": times, "precipitation": precip}}


class ReconstructRainfallTests(SimpleTestCase):
    def test_aligns_to_event_hour_and_accumulates(self):
        when = datetime(2024, 7, 15, 14)
        data = hourly_series(when, value=1.0, spike=25.0)
        r = reconstruct_rainfall(data, when)
        self.assertEqual(r.current_rainfall_strength, 25.0)
        self.assertEqual(r.forecast_strength_1hr, 1.0)
        self.assertEqual(r.accumulated_24hr, 23 * 1.0 + 25.0)  # 23 prior hours + spike


def make_barangay(name, code, height):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332",
        boundary=MultiPolygon(poly), land_height_mean=height,
    )


class HindcastScoreTests(TestCase):
    def test_heavy_rain_scores_and_is_not_degraded_with_susceptibility_loaded(self):
        barangay = make_barangay("Lowland", "L1", height=1.0)
        when = timezone.now() - timedelta(days=10)
        susceptibility = {barangay.id: {"level": "high", "value": 0.8, "zone_count": 1}}

        def fetcher(lat, lon, w):
            return hourly_series(w, value=40.0, spike=50.0)

        result = hindcast_score(barangay, when, susceptibility, fetcher=fetcher)
        self.assertGreater(result.score, 0)
        # Susceptibility is static reference data (not a live feed), unlike the
        # old dam factor — once loaded it's available for every hindcast.
        self.assertFalse(result.is_degraded)

    def test_no_susceptibility_data_degrades(self):
        barangay = make_barangay("Lowland", "L1", height=1.0)
        when = timezone.now() - timedelta(days=10)

        def fetcher(lat, lon, w):
            return hourly_series(w, value=40.0, spike=50.0)

        result = hindcast_score(barangay, when, {}, fetcher=fetcher)
        self.assertTrue(result.is_degraded)
