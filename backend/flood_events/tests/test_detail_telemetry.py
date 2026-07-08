from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from flood_events.models import FloodEvent, FloodEventTimelineEntry
from rainfall_fetch.models import Rainfall
from risk_score.models import RiskScore


def make_barangay(name, code):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class FloodEventDetailTelemetryTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(self.user)
        self.barangay = make_barangay("Tumaga", "T1")
        self.at = timezone.now()
        self.event = FloodEvent.objects.create(
            barangay=self.barangay,
            occurred_at=self.at,
            ended_at=self.at + timedelta(hours=6),
            severity="major",
            people_affected=340,
        )

    def _get(self):
        resp = self.client.get(reverse("flood-event-detail", args=[self.event.id]))
        self.assertEqual(resp.status_code, 200)
        return resp.data

    def test_duration_and_stored_fields(self):
        data = self._get()
        self.assertEqual(data["duration_hours"], 6.0)
        self.assertEqual(data["people_affected"], 340)

    def test_timeline_is_nested_in_order(self):
        FloodEventTimelineEntry.objects.create(
            flood_event=self.event, occurred_at=self.at + timedelta(hours=1), title="Dispatched"
        )
        FloodEventTimelineEntry.objects.create(
            flood_event=self.event, occurred_at=self.at, title="Alert triggered"
        )
        titles = [e["title"] for e in self._get()["timeline"]]
        self.assertEqual(titles, ["Alert triggered", "Dispatched"])

    def test_telemetry_picks_peak_readings_in_window(self):
        # Two rainfall readings in-window; the more intense one is the peak.
        Rainfall.objects.create(
            barangay=self.barangay, current_rainfall_strength=20,
            accumulated_24hr=50, recorded_at=self.at,
        )
        Rainfall.objects.create(
            barangay=self.barangay, current_rainfall_strength=90,
            accumulated_24hr=180, recorded_at=self.at + timedelta(hours=1),
        )
        RiskScore.objects.create(
            barangay=self.barangay, score=88.0, category="critical", computed_at=self.at,
        )

        tel = self._get()["telemetry"]
        self.assertEqual(tel["rainfall"]["peak_intensity"], 90)
        self.assertEqual(tel["rainfall"]["peak_accumulation_24hr"], 180)
        self.assertEqual(tel["risk"]["peak_score"], 88.0)
        self.assertEqual(tel["risk"]["category"], "critical")
        self.assertEqual(len(tel["location"]), 2)  # [lon, lat]

    def test_telemetry_is_none_safe_without_readings(self):
        tel = self._get()["telemetry"]
        self.assertIsNone(tel["rainfall"])
        self.assertIsNone(tel["risk"])

    def test_readings_outside_window_are_ignored(self):
        Rainfall.objects.create(
            barangay=self.barangay, current_rainfall_strength=99,
            accumulated_24hr=200, recorded_at=self.at + timedelta(hours=48),
        )
        self.assertIsNone(self._get()["telemetry"]["rainfall"])
