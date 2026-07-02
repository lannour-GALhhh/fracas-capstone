from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from dam_level.models import Dam, DamReading
from monitoring.constants import SOURCE_DAM, SOURCE_RAINFALL, STALE_AFTER
from rainfall_fetch.models import Rainfall
from risk_score.services.context import ScoringContext

from .test_compute import make_barangay


class ContextStalenessTests(TestCase):
    def setUp(self):
        self.barangay = make_barangay("Lowland", "L1", height=1.0)

    def test_fresh_rainfall_is_kept(self):
        Rainfall.objects.create(
            barangay=self.barangay,
            recorded_at=timezone.now(),
            current_rainfall_strength=10.0,
        )
        context = ScoringContext.build()
        self.assertIsNotNone(context.rainfall_for(self.barangay))

    def test_stale_rainfall_is_dropped(self):
        stale_at = timezone.now() - STALE_AFTER[SOURCE_RAINFALL] - timedelta(minutes=1)
        Rainfall.objects.create(
            barangay=self.barangay,
            recorded_at=stale_at,
            current_rainfall_strength=10.0,
        )
        context = ScoringContext.build()
        self.assertIsNone(context.rainfall_for(self.barangay))

    def test_stale_dam_reading_is_dropped(self):
        Dam.objects.all().delete()
        dam = Dam.objects.create(name="D", normal_level=74.2, critical_level=76.2)
        stale_at = timezone.now() - STALE_AFTER[SOURCE_DAM] - timedelta(minutes=1)
        DamReading.objects.create(dam=dam, water_level=75.0, recorded_at=stale_at)
        context = ScoringContext.build()
        self.assertIsNone(context.dam_reading)
