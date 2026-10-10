"""Stand-down, notifications + retention purge."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone

from audit.models import ConfigChangeLog
from barangays.models import Barangay
from evacuation.models import Evacuation, EvacuationStatus
from evacuation.services.lifecycle import send_evac_push, stand_down
from users.models import Subscription

User = get_user_model()


def _barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class StandDownTests(TestCase):
    def setUp(self):
        cache.clear()  # dashboard cache is process-global
        self.barangay = _barangay()
        # A roster so the frozen final counts have a denominator.
        for i in range(3):
            u = User.objects.create_user(f"r{i}", password="pw")
            Subscription.objects.create(user=u, barangay=self.barangay)

    def _open(self, zones=None):
        return Evacuation.objects.create(
            barangay=self.barangay,
            trigger=Evacuation.Trigger.OPERATOR,
            zones=zones or [],
        )

    def test_stand_down_freezes_counts_and_audits(self):
        evac = self._open()
        stand_down(evac)

        evac.refresh_from_db()
        self.assertEqual(evac.status, Evacuation.Status.STOOD_DOWN)
        self.assertIsNotNone(evac.closed_at)
        self.assertEqual(evac.final_roster, 3)
        self.assertTrue(
            ConfigChangeLog.objects.filter(target="evacuation", action="stood_down").exists()
        )

    def test_opening_push_notifies_every_subscriber_and_names_zones(self):
        from users.models import Notification

        send_evac_push(self.barangay, [{"level": "very_high", "score": 80, "category": "critical"}])

        notes = Notification.objects.filter(barangay=self.barangay)
        self.assertEqual(notes.count(), 3)  # one per subscriber
        self.assertTrue(notes.first().title.startswith("Evacuate now"))
        self.assertIn("very high", notes.first().body)

    def test_stand_down_sends_an_all_clear_to_subscribers(self):
        from users.models import Notification

        stand_down(self._open())

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
