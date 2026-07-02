from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from monitoring.constants import RAINFALL_RETENTION_DAYS, RISK_SCORE_RETENTION_DAYS
from monitoring.tasks import cleanup_old_data
from rainfall_fetch.models import Rainfall
from risk_score.constants import RiskCategory
from risk_score.models import RiskScore
from risk_score.tests.test_compute import make_barangay


class CleanupTests(TestCase):
    def setUp(self):
        self.barangay = make_barangay("B", "B1", height=1.0)
        now = timezone.now()
        Rainfall.objects.create(
            barangay=self.barangay,
            recorded_at=now - timedelta(days=RAINFALL_RETENTION_DAYS + 1),
        )
        Rainfall.objects.create(barangay=self.barangay, recorded_at=now)
        RiskScore.objects.create(
            barangay=self.barangay,
            score=1.0,
            category=RiskCategory.LOW,
            computed_at=now - timedelta(days=RISK_SCORE_RETENTION_DAYS + 1),
        )
        RiskScore.objects.create(
            barangay=self.barangay, score=1.0, category=RiskCategory.LOW, computed_at=now
        )

    def test_prunes_only_rows_past_retention(self):
        result = cleanup_old_data()
        self.assertEqual(result["rainfall_deleted"], 1)
        self.assertEqual(result["risk_score_deleted"], 1)
        self.assertEqual(Rainfall.objects.count(), 1)
        self.assertEqual(RiskScore.objects.count(), 1)
