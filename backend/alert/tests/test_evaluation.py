from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from alert.models import AlertState
from alert.services.evaluation import evaluate
from risk_score.constants import RiskCategory

from .factories import make_barangay, make_score


class AlertStateMachineTests(TestCase):
    def setUp(self):
        self.barangay = make_barangay()
        # No subscribers needed to exercise the transition logic.
        self.dispatch_patch = patch("alert.services.evaluation.dispatch")
        self.dispatch = self.dispatch_patch.start()
        self.addCleanup(self.dispatch_patch.stop)

    def test_transition_into_critical_notifies_once(self):
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now())
        self.assertEqual(evaluate()["notified"], 1)
        state = AlertState.objects.get(barangay=self.barangay)
        self.assertEqual(state.level, RiskCategory.CRITICAL)
        self.assertIsNotNone(state.last_notified_at)

    def test_sustained_critical_does_not_renotify_within_interval(self):
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now() - timedelta(minutes=30))
        evaluate()
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now())
        self.assertEqual(evaluate()["notified"], 0)  # still inside RENOTIFY_INTERVAL

    def test_sustained_critical_renotifies_after_interval(self):
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now())
        evaluate()
        AlertState.objects.filter(barangay=self.barangay).update(
            last_notified_at=timezone.now() - timedelta(hours=2)
        )
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now())
        self.assertEqual(evaluate()["notified"], 1)

    def test_suppressed_barangay_is_not_notified(self):
        AlertState.objects.create(barangay=self.barangay, is_suppressed=True)
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now())
        self.assertEqual(evaluate()["notified"], 0)
        self.dispatch.assert_not_called()
        # Level is still tracked so alerts resume correctly once un-suppressed.
        self.assertEqual(
            AlertState.objects.get(barangay=self.barangay).level, RiskCategory.CRITICAL
        )

    def test_all_clear_notifies_and_lowers_level(self):
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now() - timedelta(minutes=1))
        evaluate()
        make_score(self.barangay, RiskCategory.LOW, when=timezone.now())
        self.assertEqual(evaluate()["notified"], 1)
        self.assertEqual(AlertState.objects.get(barangay=self.barangay).level, RiskCategory.LOW)
