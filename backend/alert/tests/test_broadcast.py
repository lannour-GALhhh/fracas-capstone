from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from alert.models import Notification
from alert.services.dispatcher import broadcast
from users.models import Subscription

from .factories import make_barangay


class _BroadcastBase(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.user = get_user_model().objects.create_user("resident", password="pw")
        Subscription.objects.create(user=self.user, barangay=self.barangay)
        patch("alert.tasks.send_sms_task.delay").start()
        patch("alert.tasks.send_push_task.delay").start()
        self.addCleanup(patch.stopall)


class BroadcastServiceTests(_BroadcastBase):
    def test_reaches_subscriber_inapp(self):
        recipients = broadcast(self.barangay, "Title", "Body", "bkey")
        self.assertEqual(recipients, 1)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)


class BroadcastApiTests(_BroadcastBase):
    def test_requires_admin(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(
            reverse("alert-broadcast"),
            {"barangay": self.barangay.id, "message": "hi"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_admin_broadcast_creates_notifications(self):
        admin = get_user_model().objects.create_superuser("root", password="pw")
        self.client.force_authenticate(admin)
        resp = self.client.post(
            reverse("alert-broadcast"),
            {"barangay": self.barangay.id, "message": "Evacuate now"},
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["recipients"], 1)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
