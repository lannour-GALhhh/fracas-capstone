from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from monitoring.constants import SOURCE_DAM, SOURCE_RAINFALL, STALE_AFTER
from monitoring.models import IngestionHealth
from monitoring.services import health


class CheckIngestionTests(TestCase):
    def test_missing_source_is_not_fresh(self):
        result = health.check_ingestion()
        self.assertFalse(result[SOURCE_DAM]["fresh"])
        self.assertEqual(result[SOURCE_DAM]["status"], "no data")

    def test_recent_success_is_fresh(self):
        IngestionHealth.objects.create(
            source=SOURCE_RAINFALL, last_success_at=timezone.now()
        )
        result = health.check_ingestion()
        self.assertTrue(result[SOURCE_RAINFALL]["fresh"])

    def test_stale_success_is_not_fresh(self):
        old = timezone.now() - STALE_AFTER[SOURCE_RAINFALL] - timedelta(minutes=1)
        IngestionHealth.objects.create(source=SOURCE_RAINFALL, last_success_at=old)
        result = health.check_ingestion()
        self.assertFalse(result[SOURCE_RAINFALL]["fresh"])
