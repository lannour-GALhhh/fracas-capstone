from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


class HealthApiTests(APITestCase):
    def test_liveness_is_public_and_ok(self):
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "ok")

    def test_readiness_is_public_and_reports_dependencies(self):
        resp = self.client.get("/api/health/ready/")
        # DB and cache are up in the test stack, so the probe passes.
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["ready"])
        self.assertTrue(resp.data["database"]["ok"])

    def test_status_requires_admin(self):
        # Anonymous request is challenged (401) by the JWT authenticator.
        self.assertEqual(self.client.get("/api/health/status/").status_code, 401)

    def test_status_forbidden_for_non_admin(self):
        user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get("/api/health/status/").status_code, 403)

    def test_status_returns_report_for_admin(self):
        admin = get_user_model().objects.create_superuser("root", password="pw")
        self.client.force_authenticate(admin)
        resp = self.client.get("/api/health/status/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("ingestion", resp.data)
        self.assertIn("healthy", resp.data)
