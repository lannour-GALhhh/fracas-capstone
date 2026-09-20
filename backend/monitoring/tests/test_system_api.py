"""Admin system-ops endpoints: the status report shape and the manual
pipeline / retention triggers (with the Celery task .delay patched)."""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from audit.models import ConfigChangeLog

User = get_user_model()


class SystemStatusTests(APITestCase):
    def setUp(self):
        self.resident = User.objects.create_user("resident", password="pw")
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.url = reverse("admin-system-status")

    def test_resident_forbidden(self):
        self.client.force_authenticate(self.resident)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_report_has_pipeline_and_cadence(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        # Base health fields plus the ops enrichments.
        self.assertIn("database", resp.data)
        self.assertIn("pipeline", resp.data)
        self.assertEqual(set(resp.data["pipeline"]), {"rainfall", "scoring", "evacuation"})
        self.assertIsInstance(resp.data["cadence"], list)
        # No scores yet -> scoring stage reports no last run and not fresh.
        self.assertIsNone(resp.data["pipeline"]["scoring"]["last_run"])
        self.assertFalse(resp.data["pipeline"]["scoring"]["fresh"])


class ManualRunTests(APITestCase):
    def setUp(self):
        self.operator = User.objects.create_user("operator", password="pw", is_operator=True)
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)

    def test_pipeline_run_is_admin_only(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.post(reverse("admin-pipeline-run"))
        self.assertEqual(resp.status_code, 403)

    @patch("risk_score.tasks.run_scoring_pipeline.delay")
    def test_pipeline_run_queues_and_audits(self, delay):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(reverse("admin-pipeline-run"))
        self.assertEqual(resp.status_code, 200)
        delay.assert_called_once()
        self.assertTrue(
            ConfigChangeLog.objects.filter(action="pipeline_run", actor=self.admin).exists()
        )

    @patch("monitoring.tasks.cleanup_old_data.delay")
    def test_retention_run_queues_and_audits(self, delay):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(reverse("admin-retention-run"))
        self.assertEqual(resp.status_code, 200)
        delay.assert_called_once()
        self.assertTrue(
            ConfigChangeLog.objects.filter(action="retention_run", actor=self.admin).exists()
        )
