from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from flood_events.models import FloodEvent, FloodEventTimelineEntry


def make_barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class FloodEventWriteApiTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.resident = get_user_model().objects.create_user("resident", password="pw")
        self.operator = get_user_model().objects.create_user(
            "operator", password="pw", is_operator=True
        )
        self.now = timezone.now()

    def _payload(self, **overrides):
        payload = {
            "barangay": self.barangay.id,
            "occurred_at": self.now.isoformat(),
            "severity": "major",
            "people_affected": 340,
            "timeline": [
                {"occurred_at": self.now.isoformat(), "title": "Alert triggered"},
            ],
        }
        payload.update(overrides)
        return payload

    def test_resident_cannot_create(self):
        self.client.force_authenticate(self.resident)
        resp = self.client.post(reverse("flood-event-list"), self._payload(), format="json")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(FloodEvent.objects.count(), 0)

    def test_operator_creates_with_nested_timeline(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.post(reverse("flood-event-list"), self._payload(), format="json")
        self.assertEqual(resp.status_code, 201)

        event = FloodEvent.objects.get()
        self.assertEqual(event.people_affected, 340)
        self.assertEqual(event.timeline.count(), 1)
        self.assertEqual(event.timeline.first().title, "Alert triggered")

    def test_update_replaces_timeline(self):
        self.client.force_authenticate(self.operator)
        create = self.client.post(reverse("flood-event-list"), self._payload(), format="json")
        event_id = create.data["id"]

        resp = self.client.patch(
            reverse("flood-event-detail", args=[event_id]),
            {"timeline": [{"occurred_at": self.now.isoformat(), "title": "All clear"}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        titles = list(
            FloodEventTimelineEntry.objects.filter(flood_event_id=event_id).values_list(
                "title", flat=True
            )
        )
        self.assertEqual(titles, ["All clear"])  # replace-all, not append

    def test_ended_before_occurred_is_rejected(self):
        self.client.force_authenticate(self.operator)
        earlier = (self.now - timezone.timedelta(hours=1)).isoformat()
        resp = self.client.post(
            reverse("flood-event-list"),
            self._payload(ended_at=earlier),
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("ended_at", resp.data)

    def test_resident_cannot_delete(self):
        event = FloodEvent.objects.create(
            barangay=self.barangay, occurred_at=self.now, severity="minor"
        )
        self.client.force_authenticate(self.resident)
        resp = self.client.delete(reverse("flood-event-detail", args=[event.id]))
        self.assertEqual(resp.status_code, 403)

    def test_operator_deletes(self):
        event = FloodEvent.objects.create(
            barangay=self.barangay, occurred_at=self.now, severity="minor"
        )
        self.client.force_authenticate(self.operator)
        resp = self.client.delete(reverse("flood-event-detail", args=[event.id]))
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(FloodEvent.objects.count(), 0)
