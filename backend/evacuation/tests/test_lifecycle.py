"""Automated open/close reconciliation + retention purge."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone

from alert.models import AlertState
from audit.models import ConfigChangeLog
from barangays.models import Barangay
from evacuation.models import Evacuation, EvacuationStatus
from evacuation.services.lifecycle import reconcile
from risk_score.constants import RiskCategory
from users.models import Subscription

User = get_user_model()


def _barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class ReconcileTests(TestCase):
    def setUp(self):
        cache.clear()  # AlertingPolicy + dashboard caches are process-global
        self.barangay = _barangay()
        # A roster so the frozen final counts have a denominator.
        for i in range(3):
            u = User.objects.create_user(f"r{i}", password="pw")
            Subscription.objects.create(user=u, barangay=self.barangay)

    def _set_level(self, level, *, suppressed=False):
        AlertState.objects.update_or_create(
            barangay=self.barangay,
            defaults={"level": level, "is_suppressed": suppressed},
        )

    def test_opens_automated_evacuation_for_barangay_in_band(self):
        self._set_level(RiskCategory.CRITICAL)
        result = reconcile()

        self.assertEqual(result["opened"], 1)
        evac = Evacuation.objects.get(barangay=self.barangay, status="active")
        self.assertEqual(evac.trigger, Evacuation.Trigger.AUTOMATED)
        self.assertIsNone(evac.triggered_by)
        self.assertTrue(
            ConfigChangeLog.objects.filter(
                target="evacuation", action="auto_opened", actor__isnull=True
            ).exists()
        )

    def test_reconcile_is_idempotent(self):
        self._set_level(RiskCategory.CRITICAL)
        self.assertEqual(reconcile()["opened"], 1)
        self.assertEqual(reconcile()["opened"], 0)  # already open — no duplicate
        self.assertEqual(Evacuation.objects.filter(barangay=self.barangay).count(), 1)

    def test_suppressed_barangay_is_not_auto_opened(self):
        self._set_level(RiskCategory.CRITICAL, suppressed=True)
        self.assertEqual(reconcile()["opened"], 0)
        self.assertFalse(Evacuation.objects.filter(status="active").exists())

    def test_below_band_opens_nothing(self):
        self._set_level(RiskCategory.HIGH)  # default policy triggers on CRITICAL only
        self.assertEqual(reconcile()["opened"], 0)

    def test_hazard_clearing_stands_down_automated_evacuation(self):
        # Open via the reconciler, then drop the barangay out of the band.
        self._set_level(RiskCategory.CRITICAL)
        reconcile()
        self._set_level(RiskCategory.LOW)

        result = reconcile()
        self.assertEqual(result["closed"], 1)
        evac = Evacuation.objects.get(barangay=self.barangay)
        self.assertEqual(evac.status, Evacuation.Status.STOOD_DOWN)
        self.assertIsNotNone(evac.closed_at)
        self.assertEqual(evac.final_roster, 3)  # counts frozen on close
        self.assertTrue(
            ConfigChangeLog.objects.filter(
                target="evacuation", action="stood_down", actor__isnull=True
            ).exists()
        )

    def test_operator_evacuation_is_never_auto_closed(self):
        Evacuation.objects.create(
            barangay=self.barangay, trigger=Evacuation.Trigger.OPERATOR
        )
        self._set_level(RiskCategory.LOW)  # not in band

        self.assertEqual(reconcile()["closed"], 0)
        self.assertTrue(
            Evacuation.objects.filter(barangay=self.barangay, status="active").exists()
        )

    def test_opening_notifies_every_subscriber_in_app(self):
        from alert.models import Notification

        self._set_level(RiskCategory.CRITICAL)
        reconcile()

        notes = Notification.objects.filter(barangay=self.barangay)
        self.assertEqual(notes.count(), 3)  # one per subscriber
        self.assertTrue(notes.first().title.startswith("Evacuate now"))

    def test_stand_down_sends_an_all_clear_to_subscribers(self):
        from alert.models import Notification

        self._set_level(RiskCategory.CRITICAL)
        reconcile()
        self._set_level(RiskCategory.LOW)
        reconcile()  # stands the automated evacuation down

        lifted = Notification.objects.filter(
            barangay=self.barangay, title__startswith="Evacuation lifted"
        )
        self.assertEqual(lifted.count(), 3)


class RetentionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.barangay = _barangay()
        self.user = User.objects.create_user("r", password="pw")

    def test_cleanup_purges_status_rows_of_long_closed_evacuations(self):
        from monitoring.tasks import cleanup_old_data

        old = Evacuation.objects.create(
            barangay=self.barangay,
            trigger=Evacuation.Trigger.AUTOMATED,
            status=Evacuation.Status.STOOD_DOWN,
            closed_at=timezone.now() - timedelta(days=30),
        )
        EvacuationStatus.objects.create(evacuation=old, user=self.user, status="safe")

        # A still-active evacuation's rows must survive.
        active = Evacuation.objects.create(
            barangay=_barangay("Other", "O1"), trigger=Evacuation.Trigger.OPERATOR
        )
        EvacuationStatus.objects.create(evacuation=active, user=self.user, status="moving")

        result = cleanup_old_data()
        self.assertEqual(result["evacuation_status_deleted"], 1)
        self.assertFalse(EvacuationStatus.objects.filter(evacuation=old).exists())
        self.assertTrue(EvacuationStatus.objects.filter(evacuation=active).exists())
