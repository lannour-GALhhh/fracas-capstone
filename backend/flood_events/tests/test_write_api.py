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

    def test_operator_soft_deletes(self):
        event = FloodEvent.objects.create(
            barangay=self.barangay, occurred_at=self.now, severity="minor"
        )
        self.client.force_authenticate(self.operator)
        resp = self.client.delete(reverse("flood-event-detail", args=[event.id]))
        self.assertEqual(resp.status_code, 204)
        # Soft delete: row survives (undo window) but is hidden from live reads.
        event.refresh_from_db()
        self.assertIsNotNone(event.deleted_at)
        self.assertEqual(FloodEvent.objects.count(), 1)
        list_resp = self.client.get(reverse("flood-event-list"))
        self.assertEqual(list_resp.data["count"], 0)

    def test_operator_source_requires_reported_by(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.post(
            reverse("flood-event-list"),
            self._payload(source_type="operator"),
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("reported_by", resp.data)

    def test_operator_source_records_reporter(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.post(
            reverse("flood-event-list"),
            self._payload(source_type="operator", reported_by=self.operator.id),
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        event = FloodEvent.objects.get()
        self.assertEqual(event.source_type, "operator")
        self.assertEqual(event.reported_by, self.operator)
        detail = self.client.get(reverse("flood-event-detail", args=[event.id]))
        self.assertEqual(detail.data["reported_by_name"], self.operator.get_username())


class FloodEventArchiveTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.operator = get_user_model().objects.create_user(
            "operator", password="pw", is_operator=True
        )
        self.client.force_authenticate(self.operator)

    def _event(self, **kwargs):
        return FloodEvent.objects.create(
            barangay=self.barangay, occurred_at=timezone.now(), severity="minor", **kwargs
        )

    def test_archive_hides_then_lists_in_archive_view(self):
        event = self._event()
        resp = self.client.post(reverse("flood-event-archive", args=[event.id]))
        self.assertEqual(resp.status_code, 200)
        event.refresh_from_db()
        self.assertIsNotNone(event.archived_at)
        self.assertTrue(event.changes.filter(action="archived").exists())
        self.assertEqual(self.client.get(reverse("flood-event-list")).data["count"], 0)
        archived = self.client.get(reverse("flood-event-list"), {"archived": "true"})
        self.assertEqual([e["id"] for e in archived.data["results"]], [event.id])
        self.assertEqual(
            self.client.get(reverse("flood-event-detail", args=[event.id])).status_code, 404
        )

    def test_resident_cannot_archive_or_see_archive(self):
        event = self._event(archived_at=timezone.now())
        resident = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(resident)
        resp = self.client.post(reverse("flood-event-archive", args=[event.id]))
        self.assertEqual(resp.status_code, 403)
        listed = self.client.get(reverse("flood-event-list"), {"archived": "true"})
        self.assertEqual(listed.data["count"], 0)

    def test_restore_and_purge(self):
        from datetime import timedelta

        from flood_events.tasks import ARCHIVE_RETENTION_DAYS, purge_archived_flood_events

        old = self._event(
            archived_at=timezone.now() - timedelta(days=ARCHIVE_RETENTION_DAYS + 1)
        )
        recent = self._event(archived_at=timezone.now())
        resp = self.client.post(reverse("flood-event-restore", args=[recent.id]))
        self.assertEqual(resp.status_code, 200)
        recent.refresh_from_db()
        self.assertIsNone(recent.archived_at)
        self.assertEqual(purge_archived_flood_events(), {"purged": 1})
        self.assertFalse(FloodEvent.objects.filter(id=old.id).exists())
        self.assertTrue(FloodEvent.objects.filter(id=recent.id).exists())
