from django.test import TestCase

from monitoring.constants import SOURCE_DAM
from monitoring.models import IngestionHealth
from monitoring.services.recorder import record_failure, record_success


class RecorderTests(TestCase):
    def test_success_creates_ok_row(self):
        record_success(SOURCE_DAM)
        health = IngestionHealth.objects.get(source=SOURCE_DAM)
        self.assertEqual(health.last_status, IngestionHealth.Status.OK)
        self.assertIsNotNone(health.last_success_at)
        self.assertEqual(health.consecutive_failures, 0)

    def test_failure_increments_consecutive_failures(self):
        record_failure(SOURCE_DAM, "boom")
        record_failure(SOURCE_DAM, "boom again")
        health = IngestionHealth.objects.get(source=SOURCE_DAM)
        self.assertEqual(health.last_status, IngestionHealth.Status.FAILED)
        self.assertEqual(health.consecutive_failures, 2)
        self.assertEqual(health.last_error, "boom again")

    def test_success_after_failure_resets(self):
        record_failure(SOURCE_DAM, "boom")
        record_success(SOURCE_DAM)
        health = IngestionHealth.objects.get(source=SOURCE_DAM)
        self.assertEqual(health.last_status, IngestionHealth.Status.OK)
        self.assertEqual(health.consecutive_failures, 0)
        self.assertEqual(health.last_error, "")
