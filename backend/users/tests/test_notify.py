from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase

from barangays.models import Barangay
from users.constants import Channel
from users.models import Device, Notification, NotificationLog, Subscription
from users.services.notify import broadcast


def make_barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class BroadcastTests(TestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.user = get_user_model().objects.create_user(
            "resident", password="pw", phone_number="+639170000001", phone_verified=True
        )
        Subscription.objects.create(user=self.user, barangay=self.barangay)
        # Patch async send enqueues so tests don't need a worker.
        self.sms = patch("users.tasks.send_sms_task.delay").start()
        self.push = patch("users.tasks.send_push_task.delay").start()
        self.addCleanup(patch.stopall)

    def _broadcast(self, key="k1"):
        broadcast(self.barangay, "Evacuate now: Tumaga", "body", key)

    def test_inapp_and_sms_for_verified_subscriber(self):
        self._broadcast()
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
        self.assertTrue(NotificationLog.objects.filter(user=self.user, channel=Channel.INAPP).exists())
        self.assertTrue(NotificationLog.objects.filter(user=self.user, channel=Channel.SMS).exists())
        self.sms.assert_called_once()

    def test_idempotent_on_same_dispatch_key(self):
        self._broadcast("dup")
        self._broadcast("dup")  # re-run same episode
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
        self.assertEqual(self.sms.call_count, 1)

    def test_unverified_phone_gets_no_sms(self):
        self.user.phone_verified = False
        self.user.save(update_fields=["phone_verified"])
        self._broadcast()
        self.assertFalse(NotificationLog.objects.filter(channel=Channel.SMS).exists())
        self.sms.assert_not_called()

    def test_push_enqueued_per_active_device(self):
        Device.objects.create(user=self.user, token="tok-abc", platform="android")
        self._broadcast()
        self.push.assert_called_once()
        self.assertTrue(NotificationLog.objects.filter(channel=Channel.PUSH).exists())
