from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay
from evacuation.models import RadiusEvacuation, RadiusEvacuationStatus
from evacuation.services import radius as radius_service
from users.models import Subscription

LAT, LNG = 6.92, 122.07


def _box(name, code, w, s, e, n):
    poly = Polygon(((w, s), (w, n), (e, n), (e, s), (w, s)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class RadiusEvacuationTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.operator = User.objects.create_user("op", password="pw", is_operator=True)
        self.resident = User.objects.create_user("res", password="pw")
        # One barangay around the point, one ~11 km away.
        self.near = _box("Near", "N1", LNG - 0.01, LAT - 0.01, LNG + 0.01, LAT + 0.01)
        self.far = _box("Far", "F1", LNG + 0.1, LAT - 0.01, LNG + 0.12, LAT + 0.01)
        Subscription.objects.create(user=self.resident, barangay=self.near)

    def _declare(self, radius=500):
        self.client.force_authenticate(self.operator)
        return self.client.post(
            reverse("radius-evacuations"),
            {"lat": LAT, "lng": LNG, "radius_m": radius, "name": "Riverbank"},
            format="json",
        )

    def test_circle_has_requested_radius(self):
        _, area = radius_service.build_circle(LAT, LNG, 1000)
        # ~1 km radius => ~0.009 degrees of latitude.
        self.assertAlmostEqual((area.extent[3] - area.extent[1]) / 2, 0.009, places=3)

    def test_declare_records_geography_and_affected_barangays(self):
        resp = self._declare(500)
        self.assertEqual(resp.status_code, 201)
        evac = RadiusEvacuation.objects.get()
        self.assertEqual(evac.radius_m, 500)
        self.assertEqual([b["name"] for b in evac.barangays], ["Near"])
        self.assertAlmostEqual(evac.center.x, LNG)
        self.assertTrue(evac.area.contains(evac.center))

    def test_resident_cannot_declare(self):
        self.client.force_authenticate(self.resident)
        resp = self.client.post(
            reverse("radius-evacuations"), {"lat": LAT, "lng": LNG, "radius_m": 500}
        )
        self.assertEqual(resp.status_code, 403)

    def test_radius_bounds_validated(self):
        self.assertEqual(self._declare(5).status_code, 400)
        self.assertEqual(self._declare(999_999).status_code, 400)

    def test_residents_see_geography_but_not_counts(self):
        self._declare()
        self.client.force_authenticate(self.resident)
        row = self.client.get(reverse("radius-evacuations")).data[0]
        self.assertEqual(row["radius_m"], 500)
        self.assertIn("center", row)
        self.assertNotIn("inside", row)
        self.client.force_authenticate(self.operator)
        self.assertEqual(self.client.get(reverse("radius-evacuations")).data[0]["inside"], 0)

    def test_report_inside_then_safe(self):
        evac_id = self._declare().data["id"]
        self.client.force_authenticate(self.resident)
        url = reverse("radius-report")
        # Can't be "evacuated" without ever having been inside.
        self.assertEqual(
            self.client.post(url, {"evacuation_id": evac_id, "status": "safe"}).status_code, 409
        )
        self.assertEqual(
            self.client.post(url, {"evacuation_id": evac_id, "status": "inside"}).status_code, 200
        )
        self.assertEqual(
            self.client.post(url, {"evacuation_id": evac_id, "status": "safe"}).status_code, 200
        )
        # Safe is terminal: re-entering doesn't reopen it.
        self.client.post(url, {"evacuation_id": evac_id, "status": "inside"})
        self.assertEqual(RadiusEvacuationStatus.objects.get().status, "safe")
        self.assertEqual(self.client.get(reverse("radius-evacuations")).data[0]["my_status"], "safe")

    def test_stand_down_freezes_counts_and_hides_from_active(self):
        evac_id = self._declare().data["id"]
        RadiusEvacuationStatus.objects.create(
            evacuation_id=evac_id, user=self.resident, status="inside"
        )
        resp = self.client.post(reverse("radius-stand-down", args=[evac_id]))
        self.assertEqual(resp.status_code, 200)
        evac = RadiusEvacuation.objects.get()
        self.assertEqual((evac.final_inside, evac.final_safe), (1, 0))
        self.assertEqual(self.client.get(reverse("radius-evacuations")).data, [])
        self.assertEqual(len(self.client.get(reverse("radius-history")).data), 1)
        # Reporting against a closed evacuation 404s.
        self.client.force_authenticate(self.resident)
        self.assertEqual(
            self.client.post(
                reverse("radius-report"), {"evacuation_id": evac_id, "status": "inside"}
            ).status_code,
            404,
        )


class PointHistoryTests(RadiusEvacuationTests):
    def test_point_rows_appear_in_history_filed_under_origin_barangay(self):
        evac_id = self._declare().data["id"]
        self.assertEqual(RadiusEvacuation.objects.get().origin_barangay, self.near)
        RadiusEvacuationStatus.objects.create(evacuation_id=evac_id, user=self.resident, status="safe")
        self.client.post(reverse("radius-stand-down", args=[evac_id]))
        url = reverse("evacuation-history")
        rows = self.client.get(url).data["results"]
        self.assertEqual([(r["type"], r["barangay"]["name"]) for r in rows], [("point", "Near")])
        self.assertEqual(rows[0]["final_roster"], 1)
        self.assertEqual(self.client.get(url, {"type": "barangay"}).data["count"], 0)
        self.assertEqual(self.client.get(url, {"type": "point"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"barangay": self.far.id}).data["count"], 0)
