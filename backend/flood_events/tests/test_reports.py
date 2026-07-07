import io
import tempfile

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase

from barangays.models import Barangay
from flood_events.models import FloodEvent, FloodEventChange, FloodEventReport


def make_image(name="evidence.png"):
    """A tiny in-memory PNG for upload tests."""
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), "blue").save(buffer, format="PNG")
    buffer.seek(0)
    buffer.name = name
    return buffer


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class FloodEventReportTests(APITestCase):
    def setUp(self):
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        self.barangay = Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )
        self.event = FloodEvent.objects.create(
            barangay=self.barangay, occurred_at=timezone.now()
        )
        self.resident = get_user_model().objects.create_user("res", password="pw")
        self.operator = get_user_model().objects.create_user("op", password="pw", is_operator=True)
        self.url = reverse("flood-event-reports", args=[self.event.id])

    def test_resident_cannot_create_report(self):
        self.client.force_authenticate(self.resident)
        resp = self.client.post(
            self.url,
            {"description": "x", "occurred_at": timezone.now().isoformat()},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 403)

    def test_operator_creates_report_with_images_and_logs(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.post(
            self.url,
            {
                "description": "Waist-deep at the junction",
                "occurred_at": timezone.now().isoformat(),
                "uploaded_images": [make_image("a.png"), make_image("b.png")],
            },
            format="multipart",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        report = FloodEventReport.objects.get()
        self.assertEqual(report.reporter, self.operator)  # reporter = current user
        self.assertEqual(report.images.count(), 2)
        self.assertTrue(
            FloodEventChange.objects.filter(
                flood_event=self.event, field="report"
            ).exists()
        )

    def test_list_returns_reports(self):
        report = FloodEventReport.objects.create(
            flood_event=self.event, reporter=self.operator, occurred_at=timezone.now()
        )
        self.client.force_authenticate(self.resident)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.data["results"]]
        self.assertIn(report.id, ids)
