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


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ResidentReportTests(APITestCase):
    def setUp(self):
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        self.barangay = Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )
        self.event = FloodEvent.objects.create(barangay=self.barangay, occurred_at=timezone.now())
        User = get_user_model()
        self.resident = User.objects.create_user("res", password="pw")
        self.other = User.objects.create_user("res2", password="pw")
        self.operator = User.objects.create_user("op", password="pw", is_operator=True)
        self.url = reverse("flood-report-list")

    def submit(self, **extra):
        payload = {
            "description": "Street under water",
            "occurred_at": timezone.now().isoformat(),
            "uploaded_images": [make_image()],
            **extra,
        }
        return self.client.post(self.url, payload, format="multipart")

    def test_resident_submits_pending_report_auto_linked_to_open_event(self):
        self.client.force_authenticate(self.resident)
        resp = self.submit(barangay=self.barangay.id)
        self.assertEqual(resp.status_code, 201, resp.data)
        report = FloodEventReport.objects.get()
        self.assertEqual(report.status, "pending")
        self.assertEqual(report.flood_event, self.event)
        self.assertEqual(report.reporter, self.resident)

    def test_gps_point_resolves_barangay(self):
        self.client.force_authenticate(self.resident)
        resp = self.submit(latitude=0.5, longitude=0.5)
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(FloodEventReport.objects.get().barangay, self.barangay)

    def test_gps_outside_any_barangay_rejected(self):
        self.client.force_authenticate(self.resident)
        self.assertEqual(self.submit(latitude=40, longitude=40).status_code, 400)

    def test_requires_photo_and_location(self):
        self.client.force_authenticate(self.resident)
        resp = self.client.post(
            self.url, {"occurred_at": timezone.now().isoformat()}, format="multipart"
        )
        self.assertEqual(resp.status_code, 400)

    def test_pending_report_hidden_from_event_evidence(self):
        self.client.force_authenticate(self.resident)
        self.submit(barangay=self.barangay.id)
        resp = self.client.get(reverse("flood-event-reports", args=[self.event.id]))
        self.assertEqual(resp.data["results"], [])

    def test_resident_sees_only_own_reports(self):
        self.client.force_authenticate(self.resident)
        self.submit(barangay=self.barangay.id)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.url).data["count"], 0)
        self.client.force_authenticate(self.operator)
        self.assertEqual(self.client.get(self.url).data["count"], 1)

    def test_resident_cannot_review(self):
        self.client.force_authenticate(self.resident)
        self.submit(barangay=self.barangay.id)
        report = FloodEventReport.objects.get()
        resp = self.client.post(
            reverse("flood-report-review", args=[report.id]), {"status": "verified"}
        )
        self.assertEqual(resp.status_code, 403)

    def test_operator_verifies_and_it_becomes_evidence(self):
        self.client.force_authenticate(self.resident)
        self.submit(barangay=self.barangay.id)
        report = FloodEventReport.objects.get()
        self.client.force_authenticate(self.operator)
        resp = self.client.post(
            reverse("flood-report-review", args=[report.id]), {"status": "verified"}
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        report.refresh_from_db()
        self.assertEqual(report.reviewed_by, self.operator)
        evidence = self.client.get(reverse("flood-event-reports", args=[self.event.id]))
        self.assertEqual(len(evidence.data["results"]), 1)

    def test_verify_needs_linked_event_but_reject_does_not(self):
        self.event.delete()
        self.client.force_authenticate(self.resident)
        self.submit(barangay=self.barangay.id)
        report = FloodEventReport.objects.get()
        self.assertIsNone(report.flood_event)
        self.client.force_authenticate(self.operator)
        url = reverse("flood-report-review", args=[report.id])
        self.assertEqual(self.client.post(url, {"status": "verified"}).status_code, 400)
        self.assertEqual(self.client.post(url, {"status": "rejected"}).status_code, 200)

    def test_operator_filters_by_date_sent(self):
        self.client.force_authenticate(self.resident)
        self.submit(barangay=self.barangay.id)
        self.client.force_authenticate(self.operator)
        today = timezone.localdate().isoformat()
        self.assertEqual(self.client.get(self.url, {"sent_after": today}).data["count"], 1)
        self.assertEqual(self.client.get(self.url, {"sent_before": "2000-01-01"}).data["count"], 0)
