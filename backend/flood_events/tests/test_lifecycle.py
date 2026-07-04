"""Lifecycle, audit trail, auto-detection, purge and config-API coverage."""

from datetime import timedelta
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from flood_events.models import (
    AutoDetectConfig,
    FloodEvent,
    FloodEventChange,
    SourceKind,
)
from flood_events.services.auto_detect import draft_events
from flood_events.tasks import purge_deleted_flood_events


def make_barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class LifecycleApiTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.resident = get_user_model().objects.create_user("resident", password="pw")
        self.operator = get_user_model().objects.create_user(
            "operator", password="pw", is_operator=True, first_name="Ops", last_name="Lead"
        )
        self.now = timezone.now()

    def _event(self, **overrides):
        fields = dict(barangay=self.barangay, occurred_at=self.now, severity="minor")
        fields.update(overrides)
        return FloodEvent.objects.create(**fields)

    def test_confirm_records_confirming_user(self):
        event = self._event(source_kind=SourceKind.AUTO, is_confirmed=False)
        self.client.force_authenticate(self.operator)
        resp = self.client.post(reverse("flood-event-confirm", args=[event.id]))
        self.assertEqual(resp.status_code, 200)
        event.refresh_from_db()
        self.assertTrue(event.is_confirmed)
        self.assertEqual(event.confirmed_by, self.operator)
        self.assertIsNotNone(event.confirmed_at)
        self.assertEqual(resp.data["confirmed_by_name"], "Ops Lead")
        self.assertTrue(
            event.changes.filter(action=FloodEventChange.Action.CONFIRMED).exists()
        )

    def test_resident_cannot_confirm(self):
        event = self._event(is_confirmed=False)
        self.client.force_authenticate(self.resident)
        resp = self.client.post(reverse("flood-event-confirm", args=[event.id]))
        self.assertEqual(resp.status_code, 403)

    def test_resolve_sets_ended_at_and_logs(self):
        event = self._event()
        ended = (self.now + timedelta(hours=3)).isoformat()
        self.client.force_authenticate(self.operator)
        resp = self.client.post(
            reverse("flood-event-resolve", args=[event.id]),
            {"ended_at": ended},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        event.refresh_from_db()
        self.assertIsNotNone(event.ended_at)
        self.assertTrue(event.is_resolved)
        self.assertTrue(
            event.changes.filter(action=FloodEventChange.Action.RESOLVED).exists()
        )

    def test_resolve_before_occurred_is_rejected(self):
        event = self._event()
        earlier = (self.now - timedelta(hours=1)).isoformat()
        self.client.force_authenticate(self.operator)
        resp = self.client.post(
            reverse("flood-event-resolve", args=[event.id]),
            {"ended_at": earlier},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_restore_undoes_soft_delete(self):
        event = self._event(deleted_at=self.now)
        self.client.force_authenticate(self.operator)
        # A soft-deleted event is hidden from live reads...
        detail = self.client.get(reverse("flood-event-detail", args=[event.id]))
        self.assertEqual(detail.status_code, 404)
        # ...but can be restored.
        resp = self.client.post(reverse("flood-event-restore", args=[event.id]))
        self.assertEqual(resp.status_code, 200)
        event.refresh_from_db()
        self.assertIsNone(event.deleted_at)
        self.assertTrue(
            event.changes.filter(action=FloodEventChange.Action.RESTORED).exists()
        )


class ChangeAuditTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.operator = get_user_model().objects.create_user(
            "operator", password="pw", is_operator=True
        )
        self.now = timezone.now()

    def test_update_records_field_diffs(self):
        self.client.force_authenticate(self.operator)
        create = self.client.post(
            reverse("flood-event-list"),
            {"barangay": self.barangay.id, "occurred_at": self.now.isoformat(), "severity": "minor"},
            format="json",
        )
        event_id = create.data["id"]
        self.client.patch(
            reverse("flood-event-detail", args=[event_id]),
            {"severity": "major", "people_affected": 50},
            format="json",
        )
        changes_resp = self.client.get(reverse("flood-event-changes", args=[event_id]))
        actions = {(c["action"], c["field"]) for c in changes_resp.data}
        self.assertIn(("created", ""), actions)
        self.assertIn(("updated", "severity"), actions)
        self.assertIn(("updated", "people_affected"), actions)
        severity_change = next(
            c for c in changes_resp.data if c["field"] == "severity"
        )
        self.assertEqual(severity_change["old_value"], "minor")
        self.assertEqual(severity_change["new_value"], "major")


class MyFloodActivityApiTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.operator = get_user_model().objects.create_user(
            "operator", password="pw", is_operator=True
        )
        self.other = get_user_model().objects.create_user(
            "other", password="pw", is_operator=True
        )
        self.resident = get_user_model().objects.create_user("resident", password="pw")
        self.event = FloodEvent.objects.create(
            barangay=self.barangay, occurred_at=timezone.now(), severity="minor"
        )
        self.url = reverse("flood-event-my-activity")

    def _change(self, editor, action):
        return FloodEventChange.objects.create(
            flood_event=self.event, editor=editor, action=action
        )

    def test_resident_is_forbidden(self):
        self.client.force_authenticate(self.resident)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_lists_only_callers_changes_newest_first(self):
        self._change(self.other, FloodEventChange.Action.CONFIRMED)
        older = self._change(self.operator, FloodEventChange.Action.CONFIRMED)
        newer = self._change(self.operator, FloodEventChange.Action.RESOLVED)
        self.client.force_authenticate(self.operator)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([row["id"] for row in resp.data["results"]], [newer.id, older.id])
        self.assertEqual(resp.data["results"][0]["barangay_name"], self.barangay.name)
        self.assertEqual(resp.data["results"][0]["flood_event"], self.event.id)


class AutoDetectTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.now = timezone.now()

    def _score(self, category, score=80.0):
        return SimpleNamespace(
            barangay=self.barangay,
            barangay_id=self.barangay.id,
            category=category,
            score=score,
            computed_at=self.now,
        )

    def test_high_score_drafts_unconfirmed_event(self):
        result = draft_events([self._score("high")])
        self.assertEqual(result["created"], 1)
        event = FloodEvent.objects.get()
        self.assertEqual(event.source_kind, SourceKind.AUTO)
        self.assertFalse(event.is_confirmed)

    def test_below_threshold_is_ignored(self):
        result = draft_events([self._score("medium")])
        self.assertEqual(result["created"], 0)
        self.assertEqual(FloodEvent.objects.count(), 0)

    def test_dedupes_within_window(self):
        draft_events([self._score("critical")])
        second = draft_events([self._score("critical")])
        self.assertEqual(second["created"], 0)
        self.assertEqual(FloodEvent.objects.filter(source_kind=SourceKind.AUTO).count(), 1)

    def test_disabled_config_drafts_nothing(self):
        config = AutoDetectConfig.get_solo()
        config.enabled = False
        config.save()
        result = draft_events([self._score("critical")])
        self.assertEqual(result["created"], 0)


class PurgeTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        self.now = timezone.now()

    def test_purges_only_events_past_undo_window(self):
        recent = FloodEvent.objects.create(
            barangay=self.barangay, occurred_at=self.now, severity="minor",
            deleted_at=self.now - timedelta(hours=1),
        )
        stale = FloodEvent.objects.create(
            barangay=self.barangay, occurred_at=self.now, severity="minor",
            deleted_at=self.now - timedelta(hours=7),
        )
        result = purge_deleted_flood_events()
        self.assertEqual(result["purged"], 1)
        self.assertTrue(FloodEvent.objects.filter(pk=recent.pk).exists())
        self.assertFalse(FloodEvent.objects.filter(pk=stale.pk).exists())


class AutoDetectConfigApiTests(APITestCase):
    def setUp(self):
        self.operator = get_user_model().objects.create_user(
            "operator", password="pw", is_operator=True
        )
        self.admin = get_user_model().objects.create_user(
            "admin", password="pw", is_staff=True
        )

    def test_operator_cannot_edit_config(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.patch(
            reverse("auto-detect-config"), {"enabled": False}, format="json"
        )
        self.assertEqual(resp.status_code, 403)

    def test_admin_reads_and_updates_config(self):
        self.client.force_authenticate(self.admin)
        get = self.client.get(reverse("auto-detect-config"))
        self.assertEqual(get.status_code, 200)
        self.assertTrue(get.data["enabled"])
        patch = self.client.patch(
            reverse("auto-detect-config"),
            {"enabled": False, "threshold_category": "critical"},
            format="json",
        )
        self.assertEqual(patch.status_code, 200)
        config = AutoDetectConfig.get_solo()
        self.assertFalse(config.enabled)
        self.assertEqual(config.threshold_category, "critical")
