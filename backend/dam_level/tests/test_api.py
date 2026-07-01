from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from dam_level.models import Dam, DamReading


class DamStatusApiTests(APITestCase):
    def setUp(self):
        Dam.objects.all().delete()  # ignore any seeded dam
        self.user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(self.user)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("dam-status")).status_code, 401)

    def test_no_dam_reports_no_data(self):
        resp = self.client.get(reverse("dam-status"))
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["has_data"])

    def test_returns_latest_reading(self):
        dam = Dam.objects.create(name="Pasonanca", normal_level=74.2, critical_level=76.2)
        DamReading.objects.create(
            dam=dam, water_level=75.0, rate_of_change=0.3, is_spilling=True,
            recorded_at=timezone.now(),
        )
        resp = self.client.get(reverse("dam-status"))
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["has_data"])
        self.assertEqual(resp.data["current_level"], 75.0)
        self.assertEqual(resp.data["critical_level"], 76.2)
        self.assertTrue(resp.data["is_spilling"])
