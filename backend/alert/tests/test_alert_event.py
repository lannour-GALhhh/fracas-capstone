"""AlertEvent audit log: every transition is recorded, and the operator feed."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from alert.constants import EventKind, EventSource
from alert.models import AlertEvent, AlertState
from alert.services.evaluation import evaluate
from risk_score.constants import RiskCategory

from .factories import make_barangay, make_score


class AlertEventLoggingTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        # dispatch is mocked to report 3 recipients so we can assert on it.
        self.dispatch = patch(
            "alert.services.evaluation.dispatch", return_value=3
        ).start()
        self.addCleanup(patch.stopall)

    def test_entered_transition_is_logged_with_recipients(self):
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now())
        evaluate()
        event = AlertEvent.objects.get()
        self.assertEqual(event.kind, EventKind.ENTERED)
        self.assertEqual(event.source, EventSource.AUTOMATED)
        self.assertEqual(event.recipients, 3)
        self.assertFalse(event.suppressed)

    def test_all_clear_transition_is_logged(self):
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now() - timedelta(minutes=1))
        evaluate()
        make_score(self.barangay, RiskCategory.LOW, when=timezone.now())
        evaluate()
        self.assertTrue(AlertEvent.objects.filter(kind=EventKind.ALL_CLEAR).exists())

    def test_suppressed_transition_is_logged_without_dispatch(self):
        AlertState.objects.create(barangay=self.barangay, is_suppressed=True)
        make_score(self.barangay, RiskCategory.CRITICAL, when=timezone.now())
        evaluate()
        event = AlertEvent.objects.get()
        self.assertTrue(event.suppressed)
        self.assertEqual(event.recipients, 0)
        self.dispatch.assert_not_called()

    def test_non_alert_cycle_logs_nothing(self):
        make_score(self.barangay, RiskCategory.LOW, when=timezone.now())
        evaluate()
        self.assertFalse(AlertEvent.objects.exists())


class BroadcastEventTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        patch("alert.tasks.send_sms_task.delay").start()
        patch("alert.tasks.send_push_task.delay").start()
        self.addCleanup(patch.stopall)

    def test_operator_broadcast_logs_event(self):
        op = get_user_model().objects.create_user("op", password="pw", is_operator=True)
        self.client.force_authenticate(op)
        resp = self.client.post(
            reverse("alert-broadcast"),
            {"barangay": self.barangay.id, "message": "Evacuate"},
        )
        self.assertEqual(resp.status_code, 201)
        event = AlertEvent.objects.get(kind=EventKind.BROADCAST)
        self.assertEqual(event.source, EventSource.OPERATOR)
        self.assertEqual(event.triggered_by, op)


class AlertEventApiTests(APITestCase):
    def setUp(self):
        self.barangay = make_barangay()
        AlertEvent.objects.create(
            barangay=self.barangay,
            level=RiskCategory.CRITICAL,
            kind=EventKind.ENTERED,
            source=EventSource.AUTOMATED,
            recipients=2,
            dispatch_key="k1",
        )
        self.url = reverse("alert-event-list")

    def _auth(self, **kwargs):
        user = get_user_model().objects.create_user("u", password="pw", **kwargs)
        self.client.force_authenticate(user)

    def test_resident_is_forbidden(self):
        self._auth()
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_operator_can_list(self):
        self._auth(is_operator=True)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)

    def test_filter_by_kind(self):
        self._auth(is_operator=True)
        resp = self.client.get(self.url, {"kind": EventKind.ALL_CLEAR})
        self.assertEqual(resp.data["count"], 0)

    def test_filter_triggered_by_me_scopes_to_caller(self):
        me = get_user_model().objects.create_user("me", password="pw", is_operator=True)
        other = get_user_model().objects.create_user("other", password="pw", is_operator=True)
        mine = AlertEvent.objects.create(
            barangay=self.barangay,
            level=RiskCategory.CRITICAL,
            kind=EventKind.BROADCAST,
            source=EventSource.OPERATOR,
            recipients=1,
            triggered_by=me,
            dispatch_key="mine",
        )
        AlertEvent.objects.create(
            barangay=self.barangay,
            level=RiskCategory.CRITICAL,
            kind=EventKind.BROADCAST,
            source=EventSource.OPERATOR,
            recipients=1,
            triggered_by=other,
            dispatch_key="theirs",
        )
        self.client.force_authenticate(me)
        resp = self.client.get(self.url, {"triggered_by": "me"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([row["id"] for row in resp.data["results"]], [mine.id])
