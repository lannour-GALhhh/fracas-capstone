from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from dam_level import tasks
from dam_level.models import Dam, DamReading
from dam_level.providers.base import DamSnapshot


class IngestDamLevelTests(TestCase):
    def setUp(self):
        Dam.objects.all().delete()  # ignore any seeded dam
        self.dam = Dam.objects.create(name="Test Dam", normal_level=74.2, critical_level=76.2)
        self.t0 = timezone.now()

    def _mock(self, mock_get, level, when):
        mock_get.return_value.fetch.return_value = DamSnapshot(water_level=level, recorded_at=when)

    @patch("dam_level.tasks.get_provider")
    def test_stores_reading_with_rate_and_spilling(self, mock_get):
        self._mock(mock_get, 74.5, self.t0)
        self.assertTrue(tasks.ingest_dam_level()["stored"])

        # +0.5 m over 1 h -> rate 0.5 m/h; 75.0 > normal 74.2 -> spilling.
        self._mock(mock_get, 75.0, self.t0 + timedelta(hours=1))
        tasks.ingest_dam_level()

        latest = DamReading.objects.first()
        self.assertEqual(DamReading.objects.count(), 2)
        self.assertAlmostEqual(latest.rate_of_change, 0.5)
        self.assertTrue(latest.is_spilling)

    @patch("dam_level.tasks.get_provider")
    def test_duplicate_timestamp_skipped(self, mock_get):
        self._mock(mock_get, 74.2, self.t0)
        tasks.ingest_dam_level()
        self._mock(mock_get, 74.2, self.t0)
        result = tasks.ingest_dam_level()
        self.assertFalse(result["stored"])
        self.assertEqual(DamReading.objects.count(), 1)
