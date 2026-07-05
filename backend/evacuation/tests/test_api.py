from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay
from evacuation.models import EvacuationCenter


class EvacuationCenterApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(self.user)
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        self.barangay = Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )
        EvacuationCenter.objects.create(
            name="Tumaga Gym", location=Point(0.5, 0.5, srid=4326), barangay=self.barangay, capacity=200
        )
        EvacuationCenter.objects.create(
            name="Closed Center", location=Point(0.6, 0.6, srid=4326), is_active=False
        )

    def test_returns_active_centers_as_geojson(self):
        resp = self.client.get(reverse("evacuation-center-list"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["type"], "FeatureCollection")
        # Inactive center excluded.
        self.assertEqual(len(resp.data["features"]), 1)
        feature = resp.data["features"][0]
        self.assertEqual(feature["geometry"]["type"], "Point")
        self.assertEqual(feature["properties"]["name"], "Tumaga Gym")
        self.assertEqual(feature["properties"]["barangay_name"], "Tumaga")
        self.assertEqual(feature["properties"]["capacity"], 200)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("evacuation-center-list")).status_code, 401)
