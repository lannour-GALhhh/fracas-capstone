from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay
from poi.models import FloodHotspot, MapPoiChange


class FloodHotspotApiTests(APITestCase):
    def setUp(self):
        self.resident = get_user_model().objects.create_user("res", password="pw")
        self.operator = get_user_model().objects.create_user("op", password="pw", is_operator=True)
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        self.barangay = Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )

    def test_public_read_active_only(self):
        FloodHotspot.objects.create(name="Active", location=Point(0.5, 0.5, srid=4326))
        FloodHotspot.objects.create(
            name="Inactive", location=Point(0.4, 0.4, srid=4326), is_active=False
        )
        self.client.force_authenticate(self.resident)
        resp = self.client.get(reverse("hotspot-list"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["features"]), 1)
        self.assertEqual(resp.data["features"][0]["properties"]["name"], "Active")

    def test_resident_cannot_create(self):
        self.client.force_authenticate(self.resident)
        resp = self.client.post(
            reverse("hotspot-list"),
            {"name": "X", "latitude": 0.5, "longitude": 0.5, "severity": "high", "radius_m": 200},
        )
        self.assertEqual(resp.status_code, 403)

    def test_operator_create_resolves_barangay_and_logs(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.post(
            reverse("hotspot-list"),
            {"name": "Bend", "latitude": 0.5, "longitude": 0.5, "severity": "high", "radius_m": 400},
        )
        self.assertEqual(resp.status_code, 201)
        hotspot = FloodHotspot.objects.get(name="Bend")
        self.assertEqual(hotspot.barangay, self.barangay)
        self.assertEqual(hotspot.radius_m, 400)
        self.assertTrue(
            MapPoiChange.objects.filter(poi_type="hotspot", poi_id=hotspot.id, action="created").exists()
        )
