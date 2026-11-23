from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from evacuation.models import Evacuation, EvacuationCenter
from flood_events.models import FloodEvent

User = get_user_model()


def make_barangay(name, code, x0):
    poly = Polygon(((x0, 0), (x0, 1), (x0 + 1, 1), (x0 + 1, 0), (x0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class BarangayScopeTests(APITestCase):
    def setUp(self):
        self.mine = make_barangay("Mine", "M1", 0)
        self.other = make_barangay("Other", "O1", 10)
        self.scoped = User.objects.create_user("scoped", password="pw", is_operator=True)
        self.scoped.barangays.set([self.mine])
        self.open_op = User.objects.create_user("open", password="pw", is_operator=True)
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.admin.barangays.set([self.mine])  # admins ignore assignments

    def _event(self, barangay):
        return FloodEvent.objects.create(
            barangay=barangay, occurred_at=timezone.now(), severity="major"
        )

    def _payload(self, barangay):
        return {
            "barangay": barangay.id,
            "occurred_at": timezone.now().isoformat(),
            "severity": "major",
        }

    def test_scope_helper(self):
        self.assertEqual(self.scoped.barangay_scope(), {self.mine.id})
        self.assertIsNone(self.open_op.barangay_scope())
        self.assertIsNone(self.admin.barangay_scope())

    def test_flood_event_create_limited_to_scope(self):
        self.client.force_authenticate(self.scoped)
        url = reverse("flood-event-list")
        self.assertEqual(self.client.post(url, self._payload(self.mine), format="json").status_code, 201)
        self.assertEqual(self.client.post(url, self._payload(self.other), format="json").status_code, 403)

    def test_flood_event_actions_limited_to_scope(self):
        event = self._event(self.other)
        self.client.force_authenticate(self.scoped)
        self.assertEqual(
            self.client.post(reverse("flood-event-confirm", args=[event.pk])).status_code, 403
        )
        self.assertEqual(
            self.client.patch(reverse("flood-event-detail", args=[event.pk]), {"severity": "minor"}, format="json").status_code,
            403,
        )
        self.assertEqual(self.client.delete(reverse("flood-event-detail", args=[event.pk])).status_code, 403)
        # Reads stay open.
        self.assertEqual(self.client.get(reverse("flood-event-detail", args=[event.pk])).status_code, 200)

    def test_unscoped_operator_and_admin_unrestricted(self):
        event = self._event(self.other)
        for user in (self.open_op, self.admin):
            self.client.force_authenticate(user)
            self.assertEqual(
                self.client.post(reverse("flood-event-confirm", args=[event.pk])).status_code, 200
            )

    def test_ping_and_stand_down_limited_to_scope(self):
        self.client.force_authenticate(self.scoped)
        resp = self.client.post(reverse("evacuation-ping"), {"barangay_id": self.other.id}, format="json")
        self.assertEqual(resp.status_code, 403)
        evac = Evacuation.objects.create(
            barangay=self.other, trigger=Evacuation.Trigger.OPERATOR, zones=[{"level": "high"}]
        )
        resp = self.client.post(reverse("evacuation-stand-down", args=[evac.pk]))
        self.assertEqual(resp.status_code, 403)

    def test_radius_must_stay_inside_scope(self):
        self.client.force_authenticate(self.scoped)
        url = reverse("radius-evacuations")
        resp = self.client.post(url, {"lat": 0.5, "lng": 10.5, "radius_m": 100}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_center_writes_limited_to_scope(self):
        center = EvacuationCenter.objects.create(
            name="Far", location=Point(10.5, 0.5, srid=4326), barangay=self.other
        )
        self.client.force_authenticate(self.scoped)
        self.assertEqual(
            self.client.patch(reverse("evacuation-center-detail", args=[center.pk]), {"name": "x"}, format="json").status_code,
            403,
        )
        resp = self.client.post(
            reverse("evacuation-center-list"),
            {"name": "New", "latitude": 0.5, "longitude": 10.5},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)
        resp = self.client.post(
            reverse("evacuation-center-list"),
            {"name": "New", "latitude": 0.5, "longitude": 0.5},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)


class AdminAssignsBarangaysTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.b1 = make_barangay("A", "A1", 0)
        self.b2 = make_barangay("B", "B1", 10)
        self.client.force_authenticate(self.admin)

    def test_create_with_barangays_and_edit(self):
        resp = self.client.post(
            reverse("admin-user-list"),
            {
                "email": "op@example.com", "first_name": "Op", "last_name": "Erator",
                "is_operator": True, "barangays": [self.b1.id],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        user = User.objects.get(pk=resp.data["id"])
        self.assertEqual(user.barangay_scope(), {self.b1.id})

        resp = self.client.patch(
            reverse("admin-user-detail", args=[user.pk]), {"barangays": []}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(User.objects.get(pk=user.pk).barangay_scope())
        self.assertTrue(user.account_changes.filter(field="barangays").exists())
