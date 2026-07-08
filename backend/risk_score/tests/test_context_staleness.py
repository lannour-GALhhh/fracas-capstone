from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from monitoring.constants import SOURCE_RAINFALL, STALE_AFTER
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
