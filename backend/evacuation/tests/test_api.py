import tempfile
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from barangays.models import Barangay
from evacuation.models import (
    Evacuation,
    EvacuationCenter,
    EvacuationCenterImage,
    EvacuationStatus,
)
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

    def test_create_with_multiple_contacts(self):
        resp = self.client.post(
            reverse("evacuation-center-list"),
            {
                "name": "Multi",
                "latitude": 0.5,
                "longitude": 0.5,
                "contacts": [
                    {"label": "Principal", "phone": "0917111"},
                    {"label": "", "phone": "0917222"},
                ],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        props = resp.data["properties"]
        self.assertEqual([c["phone"] for c in props["contacts"]], ["0917111", "0917222"])
        self.assertEqual(props["contact"], "0917111")  # legacy single field = first

    def test_update_replaces_contacts_only_when_sent(self):
        center = EvacuationCenter.objects.create(
            name="Gym", location=Point(0.5, 0.5, srid=4326)
        )
        center.contacts.create(phone="1")
        url = reverse("evacuation-center-detail", args=[center.id])
        self.client.patch(url, {"capacity": 5}, format="json")
        self.assertEqual(center.contacts.count(), 1)  # untouched
        self.client.patch(url, {"contacts": [{"phone": "2"}, {"phone": "3"}]}, format="json")
        self.assertEqual(list(center.contacts.values_list("phone", flat=True)), ["2", "3"])

    def test_image_upload_and_remove(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from io import BytesIO
        from PIL import Image

        buf = BytesIO()
        Image.new("RGB", (4, 4)).save(buf, "PNG")
        center = EvacuationCenter.objects.create(
            name="Gym", location=Point(0.5, 0.5, srid=4326)
        )
        files = [
            SimpleUploadedFile(f"p{i}.png", buf.getvalue(), content_type="image/png")
            for i in range(2)
        ]
        with self.settings(MEDIA_ROOT=tempfile.mkdtemp()):
            resp = self.client.post(
                reverse("evacuation-center-add-images", args=[center.id]),
                {"images": files},
                format="multipart",
            )
            self.assertEqual(resp.status_code, 201)
            self.assertEqual(center.images.count(), 2)
            image_id = resp.data[0]["id"]
            resp = self.client.delete(
                reverse("evacuation-center-remove-image", args=[center.id, image_id])
            )
            self.assertEqual(resp.status_code, 204)
            self.assertEqual(center.images.count(), 1)

    def test_reorder_images(self):
        center = EvacuationCenter.objects.create(
            name="Gym", location=Point(0.5, 0.5, srid=4326)
        )
        a, b, c = (
            EvacuationCenterImage.objects.create(center=center, image=f"x{i}.png", position=i)
            for i in range(3)
        )
        url = reverse("evacuation-center-reorder-images", args=[center.id])
        resp = self.client.post(url, {"ids": [c.id, a.id, b.id]}, format="json")
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(list(center.images.values_list("id", flat=True)), [c.id, a.id, b.id])
        # Must list every image exactly once.
        bad = self.client.post(url, {"ids": [a.id]}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_image_upload_requires_operator(self):
        center = EvacuationCenter.objects.create(
            name="Gym", location=Point(0.5, 0.5, srid=4326)
        )
        self.client.force_authenticate(get_user_model().objects.create_user("res", password="pw"))
        resp = self.client.post(
            reverse("evacuation-center-add-images", args=[center.id]), {}, format="multipart"
        )
        self.assertEqual(resp.status_code, 403)

    def test_delete_logs(self):
        center = EvacuationCenter.objects.create(
            name="Gym", location=Point(0.5, 0.5, srid=4326)
        )
        resp = self.client.delete(reverse("evacuation-center-detail", args=[center.id]))
        self.assertEqual(resp.status_code, 204)
        # Archived, not deleted.
        center.refresh_from_db()
        self.assertIsNotNone(center.archived_at)
        self.assertTrue(MapPoiChange.objects.filter(poi_id=center.id, action="archived").exists())
        listed = self.client.get(reverse("evacuation-center-list")).data["features"]
        self.assertNotIn(center.id, [f["properties"]["id"] for f in listed])
        archived = self.client.get(reverse("evacuation-center-list"), {"archived": "true"})
        self.assertEqual([f["properties"]["id"] for f in archived.data["features"]], [center.id])

    def test_restore_and_purge(self):
        from evacuation.tasks import ARCHIVE_RETENTION_DAYS, purge_archived_centers

        old = EvacuationCenter.objects.create(
            name="Old", location=Point(0.5, 0.5, srid=4326),
            archived_at=timezone.now() - timedelta(days=ARCHIVE_RETENTION_DAYS + 1),
        )
        recent = EvacuationCenter.objects.create(
            name="Recent", location=Point(0.5, 0.5, srid=4326), archived_at=timezone.now()
        )
        resp = self.client.post(reverse("evacuation-center-restore", args=[recent.id]))
        self.assertEqual(resp.status_code, 200)
        recent.refresh_from_db()
        self.assertIsNone(recent.archived_at)
        self.assertEqual(purge_archived_centers(), {"purged": 1})
        self.assertFalse(EvacuationCenter.objects.filter(id=old.id).exists())
        self.assertTrue(EvacuationCenter.objects.filter(id=recent.id).exists())

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


class EvacuationHistoryApiTests(APITestCase):
    """The operator archive of stood-down evacuations."""

    def setUp(self):
        poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
        self.home = Barangay.objects.create(
            name="Tumaga", code="T1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )
        self.other = Barangay.objects.create(
            name="Other", code="O1", province_code="PH0907332", boundary=MultiPolygon(poly)
        )
        self.operator = get_user_model().objects.create_user(
            "op", password="pw", is_operator=True
        )
        self.client.force_authenticate(self.operator)

    def _closed(self, barangay, *, closed_at, trigger=Evacuation.Trigger.AUTOMATED, **kwargs):
        evac = Evacuation.objects.create(
            barangay=barangay, trigger=trigger, status=Evacuation.Status.STOOD_DOWN, **kwargs
        )
        # opened_at is auto_now_add, so rewrite both timestamps after the fact.
        Evacuation.objects.filter(pk=evac.pk).update(
            opened_at=closed_at - timedelta(hours=2), closed_at=closed_at
        )
        return evac

    def test_requires_operator(self):
        self.client.force_authenticate(
            get_user_model().objects.create_user("resident", password="pw")
        )
        self.assertEqual(self.client.get(reverse("evacuation-history")).status_code, 403)

    def test_lists_only_stood_down_newest_first(self):
        base = timezone.now()
        older = self._closed(self.home, closed_at=base - timedelta(days=3))
        newer = self._closed(self.other, closed_at=base - timedelta(days=1))
        # An still-active evacuation never appears in the archive.
        Evacuation.objects.create(barangay=self.home, trigger=Evacuation.Trigger.AUTOMATED)

        resp = self.client.get(reverse("evacuation-history"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([r["id"] for r in resp.data["results"]], [newer.id, older.id])

    def test_serializes_frozen_counts_and_duration(self):
        evac = self._closed(
            self.home,
            closed_at=timezone.now(),
            trigger=Evacuation.Trigger.OPERATOR,
            triggered_by=self.operator,
            final_roster=10,
            final_safe=7,
            final_moving=2,
            final_unaccounted=1,
        )
        row = self.client.get(reverse("evacuation-history")).data["results"][0]
        self.assertEqual(row["id"], evac.id)
        self.assertEqual(row["barangay"], {"id": self.home.id, "name": "Tumaga"})
        self.assertEqual(row["trigger"], "operator")
        self.assertEqual(row["triggered_by_name"], "op")
        self.assertEqual(row["duration_seconds"], 2 * 3600)
        self.assertEqual(row["final_roster"], 10)
        self.assertEqual(row["final_safe"], 7)
        self.assertEqual(row["final_moving"], 2)
        self.assertEqual(row["final_unaccounted"], 1)

    def test_automated_run_reports_no_operator(self):
        self._closed(self.home, closed_at=timezone.now())
        row = self.client.get(reverse("evacuation-history")).data["results"][0]
        self.assertIsNone(row["triggered_by_name"])

    def test_unfrozen_counts_serialize_as_null(self):
        """A row closed without freezing must report null, not a misleading zero."""
        self._closed(self.home, closed_at=timezone.now())
        row = self.client.get(reverse("evacuation-history")).data["results"][0]
        self.assertIsNone(row["final_roster"])
        self.assertIsNone(row["final_safe"])

    def test_filters_by_barangay_and_trigger(self):
        base = timezone.now()
        mine = self._closed(self.home, closed_at=base, trigger=Evacuation.Trigger.OPERATOR)
        self._closed(self.other, closed_at=base)

        resp = self.client.get(reverse("evacuation-history"), {"barangay": self.home.id})
        self.assertEqual([r["id"] for r in resp.data["results"]], [mine.id])

        resp = self.client.get(reverse("evacuation-history"), {"trigger": "operator"})
        self.assertEqual([r["id"] for r in resp.data["results"]], [mine.id])

        resp = self.client.get(reverse("evacuation-history"), {"trigger": "automated"})
        self.assertEqual(len(resp.data["results"]), 1)

    def test_filters_by_closed_date_range_inclusively(self):
        base = timezone.now()
        recent = self._closed(self.home, closed_at=base)
        self._closed(self.other, closed_at=base - timedelta(days=10))

        cutoff = (base - timedelta(days=1)).date().isoformat()
        resp = self.client.get(reverse("evacuation-history"), {"closed_after": cutoff})
        self.assertEqual([r["id"] for r in resp.data["results"]], [recent.id])

        # The boundary day itself is included on both ends.
        today = base.date().isoformat()
        resp = self.client.get(
            reverse("evacuation-history"), {"closed_after": today, "closed_before": today}
        )
        self.assertEqual([r["id"] for r in resp.data["results"]], [recent.id])

    def test_ignores_unparseable_date_filter(self):
        self._closed(self.home, closed_at=timezone.now())
        resp = self.client.get(reverse("evacuation-history"), {"closed_after": "not-a-date"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["results"]), 1)
