from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from flood_events.models import FloodEvent
from risk_score.models import ValidationRun
from risk_score.tasks import run_validation_task
from risk_score.tests.test_hindcast import hourly_series


def make_barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332",
        boundary=MultiPolygon(poly),
    )


class ValidationApiPermissionTests(APITestCase):
    def test_non_admin_forbidden(self):
        user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(user)
        self.assertEqual(self.client.post(reverse("validation-run-list")).status_code, 403)

    def test_admin_triggers_async_run(self):
        admin = get_user_model().objects.create_user("boss", password="pw", is_staff=True)
        self.client.force_authenticate(admin)
        with patch("risk_score.views.run_validation_task.delay") as delayed:
            resp = self.client.post(reverse("validation-run-list"))
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["status"], "pending")
        delayed.assert_called_once()


class RunValidationTaskTests(APITestCase):
    def test_task_fills_metrics(self):
        barangay = make_barangay()
        FloodEvent.objects.create(barangay=barangay, occurred_at=timezone.now() - timedelta(days=10))
        run = ValidationRun.objects.create()

        def fetcher(lat, lon, when):
            return hourly_series(when, value=45.0, spike=60.0)  # torrential

        with patch("risk_score.services.hindcast.fetch_archive", side_effect=fetcher):
            run_validation_task(run.id)

        run.refresh_from_db()
        self.assertEqual(run.status, ValidationRun.Status.DONE)
        self.assertEqual(run.events_evaluated, 1)
        self.assertEqual(run.recall, 1.0)
        self.assertEqual(len(run.details), 1)
