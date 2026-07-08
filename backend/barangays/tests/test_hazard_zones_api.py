from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay, BarangaySusceptibility

SQUARE = MultiPolygon(Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0))))


class HazardZoneApiTests(APITestCase):
    def setUp(self):
        cache.clear()  # the view is cache_page'd; isolate each test
        self.barangay = Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=SQUARE
        )
        BarangaySusceptibility.objects.create(
            barangay=self.barangay, level="high", geom=SQUARE, geom_simplified=SQUARE,
            area_sqm=1.0, source_flood_value=4.0,
        )
        self.user = get_user_model().objects.create_user("resident", password="pw")

    def test_requires_authentication(self):
        self.assertEqual(self.client.get(reverse("hazard-zone-list")).status_code, 401)

    def test_returns_unpaginated_feature_collection(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("hazard-zone-list"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["type"], "FeatureCollection")
        self.assertNotIn("results", resp.data)  # unpaginated, unlike the default viewset pagination
        feature = resp.data["features"][0]
        self.assertEqual(feature["geometry"]["type"], "MultiPolygon")
        self.assertEqual(feature["properties"]["level"], "high")
        self.assertEqual(feature["properties"]["barangay"], self.barangay.id)
