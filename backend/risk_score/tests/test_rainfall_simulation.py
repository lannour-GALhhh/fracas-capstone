from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay

HIGH_ZONE = {"level": "high", "value": 0.8, "share": 1.0}


def make_barangay(name, code):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly))


class RainfallSimulationApiTests(APITestCase):
    def setUp(self):
        self.a, self.b = make_barangay("A", "A1"), make_barangay("B", "B1")
        self.url = reverse("rainfall-simulation")

    def post(self, barangays):
        susceptibility = {
            b.id: {"level": "high", "value": 0.8, "zone_count": 1, "zones": [HIGH_ZONE]} for b in (self.a, self.b)
        }
        with patch("risk_score.services.simulation.dominant_susceptibility_by_barangay", return_value=susceptibility):
            return self.client.post(self.url, {"barangays": barangays}, format="json")

    def login_admin(self):
        self.client.force_authenticate(get_user_model().objects.create_user("boss", password="pw", is_staff=True))

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(get_user_model().objects.create_user("res", password="pw"))
        self.assertEqual(self.post([{"id": self.a.id, "rain_mm": [1.0]}]).status_code, 403)

    def test_heavier_rain_scores_higher_and_calm_stays_low(self):
        self.login_admin()
        resp = self.post(
            [
                {"id": self.a.id, "rain_mm": [0.0] * 3 + [40.0] * 6},
                {"id": self.b.id, "rain_mm": [0.0] * 9},
            ]
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["hours"], 9)
        storm, calm = resp.data["barangays"]
        self.assertEqual(len(storm["steps"]), 9)
        self.assertEqual(calm["steps"][-1]["category"], "low")
        self.assertGreater(storm["steps"][-1]["score"], calm["steps"][-1]["score"])
        self.assertIn(storm["steps"][-1]["category"], {"high", "critical"})

    def test_rejects_unequal_lengths_duplicates_and_unknown_ids(self):
        self.login_admin()
        self.assertEqual(
            self.post([{"id": self.a.id, "rain_mm": [1.0]}, {"id": self.b.id, "rain_mm": [1.0, 2.0]}]).status_code, 400
        )
        self.assertEqual(
            self.post([{"id": self.a.id, "rain_mm": [1.0]}, {"id": self.a.id, "rain_mm": [1.0]}]).status_code, 400
        )
        self.assertEqual(self.post([{"id": 999999, "rain_mm": [1.0]}]).status_code, 400)
