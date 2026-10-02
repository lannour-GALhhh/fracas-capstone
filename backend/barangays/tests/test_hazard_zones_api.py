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

    def test_returns_feature_collection(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("hazard-zone-list"))
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["type"], "FeatureCollection")
        feature = body["features"][0]
        self.assertEqual(feature["geometry"]["type"], "MultiPolygon")
        self.assertEqual(feature["properties"], {"barangay": self.barangay.id, "level": "high"})

    def test_bbox_filters_simplified_zones(self):
        self.client.force_authenticate(self.user)
        url = reverse("hazard-zone-list")
        hit = self.client.get(url, {"bbox": "0.5,0.5,2,2"}).json()
        miss = self.client.get(url, {"bbox": "5,5,6,6"}).json()
        self.assertEqual(len(hit["features"]), 1)
        self.assertEqual(miss["features"], [])

    def test_detail_full_requires_bbox(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(reverse("hazard-zone-list"), {"detail": "full"}).status_code, 400)

    def test_detail_full_rejects_oversized_bbox(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("hazard-zone-list"), {"detail": "full", "bbox": "0,0,5,5"})
        self.assertEqual(resp.status_code, 400)

    def test_detail_full_with_bbox(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("hazard-zone-list"), {"detail": "full", "bbox": "0,0,0.4,0.4"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["features"]), 1)

    def test_malformed_bbox_is_400(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(reverse("hazard-zone-list"), {"bbox": "a,b"}).status_code, 400)
