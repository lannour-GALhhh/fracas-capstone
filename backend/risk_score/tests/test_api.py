from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from rainfall_fetch.models import Rainfall
from risk_score.constants import RiskCategory
from risk_score.models import RiskScore


def make_barangay(name="Tumaga", code="T1", height=1.0):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332",
        boundary=MultiPolygon(poly), land_height_mean=height,
    )


class RiskApiTests(APITestCase):
    def setUp(self):
        cache.clear()  # force the snapshot DB fallback
        self.user = get_user_model().objects.create_user("resident", password="pw")
        self.barangay = make_barangay()
        self.now = timezone.now()

    def test_snapshot_requires_auth(self):
        self.assertEqual(self.client.get(reverse("risk-snapshot")).status_code, 401)

    def test_snapshot_falls_back_to_db(self):
        RiskScore.objects.create(
            barangay=self.barangay, score=80.0, category=RiskCategory.CRITICAL,
            is_degraded=True, computed_at=self.now,
        )
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("risk-snapshot"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["barangays"][0]["category"], "critical")

    def test_barangay_detail_shape(self):
        RiskScore.objects.create(
            barangay=self.barangay, score=80.0, category=RiskCategory.CRITICAL,
            breakdown={"rainfall": {}}, computed_at=self.now,
        )
        Rainfall.objects.create(
            barangay=self.barangay, recorded_at=self.now,
            current_rainfall_strength=12.0, forecast_strength_1hr=5.0,
        )
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("barangay-risk", args=[self.barangay.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "critical")
        self.assertEqual(resp.data["risk_score"], 80.0)
        self.assertEqual(resp.data["current_rainfall"], 12.0)
        self.assertEqual(resp.data["rainfall_forecast_1hr"], 5.0)

    def test_barangay_detail_includes_zones_and_average(self):
        RiskScore.objects.create(
            barangay=self.barangay, score=42.0, category=RiskCategory.MEDIUM,
            breakdown={"zones": [{"level": "very_high", "score": 80.0, "category": "critical"}]},
            computed_at=self.now,
        )
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("barangay-risk", args=[self.barangay.id]))
        self.assertEqual(resp.data["average"], 42.0)
        self.assertEqual(len(resp.data["zones"]), 1)
        self.assertEqual(resp.data["zones"][0]["level"], "very_high")

    def test_barangay_detail_404(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(reverse("barangay-risk", args=[999])).status_code, 404)

    def test_zones_snapshot_falls_back_to_db(self):
        RiskScore.objects.create(
            barangay=self.barangay, score=80.0, category=RiskCategory.CRITICAL,
            breakdown={"zones": [{"level": "very_high", "score": 80.0, "category": "critical"}]},
            computed_at=self.now,
        )
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("risk-zones-snapshot"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["zones"][0]["barangay_id"], self.barangay.id)

    def test_localized_risk_resolves_point(self):
        RiskScore.objects.create(
            barangay=self.barangay, score=42.0, category=RiskCategory.MEDIUM,
            breakdown={"zones": [{"level": "very_high", "score": 80.0, "category": "critical"}]},
            computed_at=self.now,
        )
        self.client.force_authenticate(self.user)
        # Point inside the unit-square boundary used by make_barangay.
        resp = self.client.get(reverse("risk-localized"), {"lat": 0.5, "lng": 0.5})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["barangay"]["id"], self.barangay.id)
        self.assertEqual(resp.data["average"], 42.0)

    def test_localized_risk_requires_coords(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(reverse("risk-localized")).status_code, 400)

    def test_localized_risk_outside_boundaries_404(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse("risk-localized"), {"lat": 80.0, "lng": 80.0})
        self.assertEqual(resp.status_code, 404)
