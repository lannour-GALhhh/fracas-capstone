"""Admin GIS upload: zip -> Celery task -> boundaries / susceptibility rows."""

import io
import json
import tempfile
import zipfile
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import GEOSGeometry
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from barangays.constants import UTM_51N
from barangays.models import Barangay, BarangaySusceptibility, GisImport

SQUARE = [(122.00, 6.90), (122.00, 6.91), (122.01, 6.91), (122.01, 6.90), (122.00, 6.90)]


def zip_of(files: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return buf.getvalue()


def boundary_geojson(city_code="PH0907332"):
    return json.dumps({
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"adm4_pcode": "PH0001", "adm4_name": "Test Brgy", "adm3_pcode": city_code, "area_sqkm": 1.2},
            "geometry": {"type": "Polygon", "coordinates": [SQUARE]},
        }],
    })


def flood_geojson():
    geom = GEOSGeometry(json.dumps({"type": "Polygon", "coordinates": [SQUARE]}), srid=4326)
    geom.transform(UTM_51N)
    return json.dumps({
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::32651"}},
        "features": [{
            "type": "Feature",
            "properties": {"Flood": 3, "susc_level": "High"},
            "geometry": json.loads(geom.geojson),
        }],
    })


class GisImportApiTests(TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        override = override_settings(GIS_IMPORT_DIR=tmp.name, CELERY_TASK_ALWAYS_EAGER=True)
        override.enable()
        self.addCleanup(override.disable)
        patcher = patch("risk_score.tasks.compute_risk_scores.delay")
        self.rescore = patcher.start()
        self.addCleanup(patcher.stop)

        User = get_user_model()
        self.admin = User.objects.create_user(username="admin", password="x", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def _upload(self, kind, files, name="layer.zip"):
        return self.client.post(
            "/api/admin/gis-imports/",
            {"kind": kind, "file": SimpleUploadedFile(name, zip_of(files))},
            format="multipart",
        )

    def test_non_admin_is_forbidden(self):
        self.client.force_authenticate(get_user_model().objects.create_user(username="res", password="x"))
        self.assertEqual(self._upload("boundary", {"a.geojson": boundary_geojson()}).status_code, 403)

    def test_boundary_import_creates_barangay_and_rescores(self):
        resp = self._upload("boundary", {"nested/a.geojson": boundary_geojson()})
        self.assertEqual(resp.status_code, 202)
        job = GisImport.objects.get()
        self.assertEqual(job.status, "succeeded")
        self.assertEqual(job.result["created"], 1)
        self.assertEqual(Barangay.objects.get().name, "Test Brgy")
        self.rescore.assert_called_once()

    def test_reupload_updates_instead_of_duplicating(self):
        self._upload("boundary", {"a.geojson": boundary_geojson()})
        self._upload("boundary", {"a.geojson": boundary_geojson()})
        self.assertEqual(Barangay.objects.count(), 1)
        self.assertEqual(GisImport.objects.first().result["updated"], 1)

    def test_other_city_is_rejected(self):
        self._upload("boundary", {"a.geojson": boundary_geojson("PH9999999")})
        job = GisImport.objects.get()
        self.assertEqual(job.status, "failed")
        self.assertIn("No Zamboanga City barangays", job.message)

    def test_susceptibility_needs_boundaries_first(self):
        self._upload("susceptibility", {"f.geojson": flood_geojson()})
        self.assertEqual(GisImport.objects.get().status, "failed")

    def test_susceptibility_import_after_boundaries(self):
        self._upload("boundary", {"a.geojson": boundary_geojson()})
        self._upload("susceptibility", {"f.geojson": flood_geojson()})
        job = GisImport.objects.first()
        self.assertEqual(job.status, "succeeded", job.message)
        zone = BarangaySusceptibility.objects.get()
        self.assertEqual(zone.level, "high")

    def test_rejects_non_zip_and_bad_archive(self):
        resp = self.client.post(
            "/api/admin/gis-imports/",
            {"kind": "boundary", "file": SimpleUploadedFile("x.txt", b"hi")},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)
        self._upload("boundary", {"readme.txt": "no layer"})
        self.assertEqual(GisImport.objects.get().status, "failed")

    def test_zip_slip_is_blocked(self):
        self._upload("boundary", {"../evil.geojson": boundary_geojson()})
        job = GisImport.objects.get()
        self.assertEqual(job.status, "failed")
        self.assertIn("unsafe", job.message)

    def test_list_and_detail(self):
        self._upload("boundary", {"a.geojson": boundary_geojson()})
        job = GisImport.objects.get()
        self.assertEqual(self.client.get("/api/admin/gis-imports/").json()[0]["id"], job.pk)
        self.assertEqual(self.client.get(f"/api/admin/gis-imports/{job.pk}/").json()["status"], "succeeded")

    def test_active_layers_report_upload_then_seed(self):
        empty = self.client.get("/api/admin/gis-imports/active/").json()
        self.assertEqual(empty, {"boundary": None, "susceptibility": None})

        self._upload("boundary", {"a.geojson": boundary_geojson()}, name="my_brgy.zip")
        active = self.client.get("/api/admin/gis-imports/active/").json()
        self.assertEqual(active["boundary"]["filename"], "my_brgy.zip")
        self.assertEqual(active["boundary"]["source"], "upload")
        self.assertEqual(active["boundary"]["records"], 1)
        self.assertIsNone(active["susceptibility"])

    def test_active_layer_falls_back_to_seed_when_loaded_without_upload(self):
        Barangay.objects.create(name="B", code="B1", province_code="PH0907332",
                                boundary=GEOSGeometry(json.dumps({"type": "MultiPolygon", "coordinates": [[SQUARE]]}), srid=4326))
        active = self.client.get("/api/admin/gis-imports/active/").json()
        self.assertEqual(active["boundary"]["source"], "seed")
