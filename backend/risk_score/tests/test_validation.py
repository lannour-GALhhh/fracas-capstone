from datetime import timedelta

from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase
from django.utils import timezone

from barangays.models import Barangay
from flood_events.models import FloodEvent
from risk_score.services.validation import validate
from risk_score.tests.test_hindcast import hourly_series


def make_barangay(name, code, height):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332",
        boundary=MultiPolygon(poly), land_height_mean=height,
    )


class ValidateTests(TestCase):
    def test_torrential_events_are_detected(self):
        b1 = make_barangay("Lowland", "L1", height=1.0)
        b2 = make_barangay("Midland", "M1", height=50.0)
        when = timezone.now() - timedelta(days=10)
        FloodEvent.objects.create(barangay=b1, occurred_at=when)
        FloodEvent.objects.create(barangay=b2, occurred_at=when)

        def fetcher(lat, lon, w):
            return hourly_series(w, value=45.0, spike=60.0)  # extreme, sustained rain

        report = validate(fetcher=fetcher)
        self.assertEqual(len(report.outcomes), 2)
        self.assertEqual(len(report.evaluated), 2)
        self.assertEqual(report.recall, 1.0)  # both flagged HIGH/CRITICAL

    def test_hindcast_error_is_recorded_not_raised(self):
        b1 = make_barangay("Lowland", "L1", height=1.0)
        when = timezone.now() - timedelta(days=10)
        FloodEvent.objects.create(barangay=b1, occurred_at=when)

        def bad_fetcher(lat, lon, w):
            return {"hourly": {"time": [], "precipitation": []}}  # event hour absent

        report = validate(fetcher=bad_fetcher)
        self.assertEqual(len(report.evaluated), 0)
        self.assertIsNone(report.recall)
        self.assertIsNotNone(report.outcomes[0].error)
