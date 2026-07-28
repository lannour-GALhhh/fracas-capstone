from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay
from evacuation.models import Evacuation, EvacuationCenter, EvacuationStatus
from poi.models import MapPoiChange
from users.models import Subscription


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

    def test_resident_cannot_create(self):
        resp = self.client.post(
            reverse("evacuation-center-list"),
            {"name": "New", "latitude": 0.5, "longitude": 0.5},
        )
        self.assertEqual(resp.status_code, 403)


class EvacuationCenterOperatorTests(APITestCase):
    def setUp(self):
        self.operator = get_user_model().objects.create_user(
            "op", password="pw", is_operator=True
        )
        self.client.force_authenticate(self.operator)
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        self.barangay = Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )

    def test_operator_sees_inactive_centers(self):
        EvacuationCenter.objects.create(
            name="Closed", location=Point(0.5, 0.5, srid=4326), is_active=False
        )
        resp = self.client.get(reverse("evacuation-center-list"))
        self.assertEqual(len(resp.data["features"]), 1)

    def test_create_resolves_barangay_and_logs(self):
        resp = self.client.post(
            reverse("evacuation-center-list"),
            {"name": "New Gym", "latitude": 0.5, "longitude": 0.5, "capacity": 300},
        )
        self.assertEqual(resp.status_code, 201)
        center = EvacuationCenter.objects.get(name="New Gym")
        self.assertEqual(center.barangay, self.barangay)  # point-in-polygon
        log = MapPoiChange.objects.get(poi_type="evacuation", poi_id=center.id)
        self.assertEqual(log.action, "created")
        self.assertEqual(log.editor, self.operator)

    def test_update_logs_changed_fields(self):
        center = EvacuationCenter.objects.create(
            name="Gym", location=Point(0.5, 0.5, srid=4326), capacity=100
        )
        resp = self.client.patch(
            reverse("evacuation-center-detail", args=[center.id]),
            {"capacity": 250, "latitude": 0.5, "longitude": 0.5},
        )
        self.assertEqual(resp.status_code, 200)
        log = MapPoiChange.objects.filter(poi_id=center.id, action="updated").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.detail["changed"]["capacity"], [100, 250])

    def test_delete_logs(self):
        center = EvacuationCenter.objects.create(
            name="Gym", location=Point(0.5, 0.5, srid=4326)
        )
        resp = self.client.delete(reverse("evacuation-center-detail", args=[center.id]))
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(EvacuationCenter.objects.filter(id=center.id).exists())
        self.assertTrue(MapPoiChange.objects.filter(poi_id=center.id, action="deleted").exists())

    def test_poi_log_endpoint_lists_changes(self):
        self.client.post(
            reverse("evacuation-center-list"),
            {"name": "Logged", "latitude": 0.5, "longitude": 0.5},
        )
        resp = self.client.get(reverse("poi-logs"))
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(resp.data["count"], 1)


class MyEvacuationsApiTests(APITestCase):
    """The resident-facing feed the mobile evacuation banner reads."""

    def setUp(self):
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        self.home = Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )
        self.other = Barangay.objects.create(
            name="Other", code="O1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )
        self.user = get_user_model().objects.create_user("resident", password="pw")
        Subscription.objects.create(user=self.user, barangay=self.home)
        self.client.force_authenticate(self.user)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("evacuation-for-me")).status_code, 401)

    def test_lists_only_subscribed_barangays_with_own_status(self):
        mine = Evacuation.objects.create(
            barangay=self.home, trigger=Evacuation.Trigger.OPERATOR
        )
        # An evacuation for a barangay the user isn't subscribed to is invisible.
        Evacuation.objects.create(barangay=self.other, trigger=Evacuation.Trigger.AUTOMATED)
        EvacuationStatus.objects.create(evacuation=mine, user=self.user, status="moving")

        resp = self.client.get(reverse("evacuation-for-me"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        row = resp.data[0]
        self.assertEqual(row["evacuation_id"], mine.id)
        self.assertEqual(row["barangay_id"], self.home.id)
        self.assertEqual(row["barangay_name"], "Tumaga")
        self.assertEqual(row["my_status"], "moving")

    def test_no_status_reports_null(self):
        Evacuation.objects.create(barangay=self.home, trigger=Evacuation.Trigger.OPERATOR)
        resp = self.client.get(reverse("evacuation-for-me"))
        self.assertIsNone(resp.data[0]["my_status"])

    def test_stood_down_evacuation_is_excluded(self):
        Evacuation.objects.create(
            barangay=self.home,
            trigger=Evacuation.Trigger.OPERATOR,
            status=Evacuation.Status.STOOD_DOWN,
        )
        resp = self.client.get(reverse("evacuation-for-me"))
        self.assertEqual(resp.data, [])
