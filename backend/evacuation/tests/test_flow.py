from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from audit.models import ConfigChangeLog
from barangays.models import Barangay
from evacuation.models import Evacuation, EvacuationStatus
from users.models import Subscription

User = get_user_model()


def _barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class EvacuationFlowTests(APITestCase):
    def setUp(self):
        cache.clear()  # dashboard cache is not transactional — isolate tests
        self.operator = User.objects.create_user("op", password="pw", is_operator=True)
        self.barangay = _barangay()
        # Three subscribers form the roster (the denominator).
        self.residents = [
            User.objects.create_user(f"r{i}", password="pw") for i in range(3)
        ]
        for r in self.residents:
            Subscription.objects.create(user=r, barangay=self.barangay)

    # --- operator ping ------------------------------------------------------

    def test_operator_ping_opens_evacuation_and_logs(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.post(
            reverse("evacuation-ping"), {"barangay_id": self.barangay.id}
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data["created"])

        evac = Evacuation.objects.get(barangay=self.barangay, status="active")
        self.assertEqual(evac.trigger, Evacuation.Trigger.OPERATOR)
        self.assertEqual(evac.triggered_by, self.operator)
        # Accountability row written.
        self.assertTrue(
            ConfigChangeLog.objects.filter(
                target="evacuation", action="pinged", actor=self.operator
            ).exists()
        )

    def test_ping_is_idempotent(self):
        self.client.force_authenticate(self.operator)
        first = self.client.post(reverse("evacuation-ping"), {"barangay_id": self.barangay.id})
        second = self.client.post(reverse("evacuation-ping"), {"barangay_id": self.barangay.id})
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.data["created"])
        self.assertEqual(Evacuation.objects.filter(barangay=self.barangay).count(), 1)

    def test_resident_cannot_ping(self):
        self.client.force_authenticate(self.residents[0])
        resp = self.client.post(reverse("evacuation-ping"), {"barangay_id": self.barangay.id})
        self.assertEqual(resp.status_code, 403)

    # --- resident report + dashboard aggregate ------------------------------

    def _open_evac(self):
        return Evacuation.objects.create(
            barangay=self.barangay, trigger=Evacuation.Trigger.OPERATOR
        )

    def test_report_upserts_and_aggregate_derives_unaccounted(self):
        evac = self._open_evac()
        self.client.force_authenticate(self.residents[0])
        resp = self.client.post(
            reverse("evacuation-report"),
            {"barangay_id": self.barangay.id, "status": "safe", "resolved_via": "left_zone"},
        )
        self.assertEqual(resp.status_code, 200)

        # One row exists (only for the reporter); a re-report updates in place.
        self.client.post(
            reverse("evacuation-report"),
            {"evacuation_id": evac.id, "status": "moving"},
        )
        self.assertEqual(EvacuationStatus.objects.filter(evacuation=evac).count(), 1)

        # Dashboard: roster 3, this reporter is 'moving', the other 2 unaccounted.
        self.client.force_authenticate(self.operator)
        data = self.client.get(reverse("evacuation-active")).data
        entry = next(e for e in data if e["evacuation_id"] == evac.id)
        self.assertEqual(entry["roster"], 3)
        self.assertEqual(entry["moving"], 1)
        self.assertEqual(entry["safe"], 0)
        self.assertEqual(entry["unaccounted"], 2)

    def test_report_requires_active_evacuation(self):
        self.client.force_authenticate(self.residents[0])
        resp = self.client.post(
            reverse("evacuation-report"),
            {"barangay_id": self.barangay.id, "status": "safe"},
        )
        self.assertEqual(resp.status_code, 404)

    # --- drill-down + stand-down -------------------------------------------

    def test_statuses_drilldown_is_operator_only(self):
        evac = self._open_evac()
        EvacuationStatus.objects.create(evacuation=evac, user=self.residents[0], status="safe")

        self.client.force_authenticate(self.residents[0])
        self.assertEqual(
            self.client.get(reverse("evacuation-statuses", args=[evac.id])).status_code, 403
        )

        self.client.force_authenticate(self.operator)
        resp = self.client.get(reverse("evacuation-statuses", args=[evac.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["status"], "safe")

    def test_stand_down_freezes_final_counts(self):
        evac = self._open_evac()
        EvacuationStatus.objects.create(evacuation=evac, user=self.residents[0], status="safe")

        self.client.force_authenticate(self.operator)
        resp = self.client.post(reverse("evacuation-stand-down", args=[evac.id]))
        self.assertEqual(resp.status_code, 200)

        evac.refresh_from_db()
        self.assertEqual(evac.status, "stood_down")
        self.assertIsNotNone(evac.closed_at)
        self.assertEqual(evac.final_roster, 3)
        self.assertEqual(evac.final_safe, 1)
        self.assertEqual(evac.final_unaccounted, 2)
        # The unique-active constraint is now free for a future evacuation.
        self.assertFalse(Evacuation.objects.filter(barangay=self.barangay, status="active").exists())
