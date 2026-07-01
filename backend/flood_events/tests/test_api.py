from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from flood_events.models import FloodEvent


def make_barangay(name, code):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class FloodEventApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("resident", password="pw")
        self.b1 = make_barangay("Tumaga", "T1")
        self.b2 = make_barangay("Guiwan", "G1")
        now = timezone.now()
        FloodEvent.objects.create(barangay=self.b1, occurred_at=now, severity="major")
        FloodEvent.objects.create(barangay=self.b2, occurred_at=now, severity="minor")
        self.client.force_authenticate(self.user)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("flood-event-list")).status_code, 401)

    def test_list_is_paginated(self):
        resp = self.client.get(reverse("flood-event-list"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 2)
        self.assertIn("results", resp.data)

    def test_filter_by_barangay(self):
        resp = self.client.get(reverse("flood-event-list"), {"barangay": self.b1.id})
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["barangay_name"], "Tumaga")

    def test_detail(self):
        event = FloodEvent.objects.filter(barangay=self.b1).first()
        resp = self.client.get(reverse("flood-event-detail", args=[event.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["severity"], "major")
