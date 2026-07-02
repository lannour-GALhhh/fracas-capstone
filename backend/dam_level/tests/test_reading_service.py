from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from dam_level.models import Dam, DamReading
from dam_level.services.reading import make_reading


class MakeReadingTests(TestCase):
    def setUp(self):
        Dam.objects.all().delete()
        self.dam = Dam.objects.create(name="D", normal_level=74.2, critical_level=76.2)
        self.now = timezone.now()

    def test_no_previous_has_no_rate_and_defaults_to_scraper(self):
        reading = make_reading(self.dam, None, water_level=74.5, recorded_at=self.now)
        self.assertIsNone(reading.rate_of_change)
        self.assertTrue(reading.is_spilling)  # 74.5 > normal 74.2
        self.assertEqual(reading.source, DamReading.Source.SCRAPER)

    def test_computes_rate_and_honors_manual_source(self):
        previous = DamReading.objects.create(
            dam=self.dam, water_level=74.0, recorded_at=self.now - timedelta(hours=1)
        )
        reading = make_reading(
            self.dam,
            previous,
            water_level=74.5,
            recorded_at=self.now,
            source=DamReading.Source.MANUAL,
        )
        self.assertAlmostEqual(reading.rate_of_change, 0.5)  # +0.5 m / 1 h
        self.assertEqual(reading.source, DamReading.Source.MANUAL)
