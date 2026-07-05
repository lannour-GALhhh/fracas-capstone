from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay


class BarangayPublicApiTests(APITestCase):
    def setUp(self):
        cache.clear()  # the view is cache_page'd; isolate each test
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )

    def test_public_boundaries_allow_anonymous(self):
        resp = self.client.get(reverse("barangay-public"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["type"], "FeatureCollection")
        feature = resp.data["features"][0]
        self.assertEqual(feature["geometry"]["type"], "MultiPolygon")
        self.assertEqual(feature["properties"]["name"], "Tumaga")
        # id rides inside properties so the client can join on it.
        self.assertIn("id", feature["properties"])

    def test_public_boundaries_omit_subscriber_count(self):
        """The one semi-private field must NOT leak on the anonymous endpoint."""
        resp = self.client.get(reverse("barangay-public"))
        self.assertNotIn("subscriber_count", resp.data["features"][0]["properties"])

    def test_authenticated_list_still_requires_auth(self):
        """The public route must not relax auth on the full list endpoint."""
        self.assertEqual(self.client.get(reverse("barangay-list")).status_code, 401)
        user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(user)
        resp = self.client.get(reverse("barangay-list"))
        self.assertEqual(resp.status_code, 200)
        self.assertIn("subscriber_count", resp.data["features"][0]["properties"])
