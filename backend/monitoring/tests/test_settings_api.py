"""Admin Settings endpoints owned by monitoring: retention, toggles, organization,
plus the public config read. Covers gating, defaults, validation, audit trail,
cache invalidation, and that consumers honour edited values."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from audit.models import ConfigChangeLog
from monitoring.models import OperationalToggles, OrganizationSettings, RetentionPolicy

User = get_user_model()


class _CacheIsolatedAPITestCase(APITestCase):
    """Redis persists across tests; keep singleton `.cached()` reads isolated."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)


class SettingsGatingTests(_CacheIsolatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.resident = User.objects.create_user("resident", password="pw")
        self.operator = User.objects.create_user("operator", password="pw", is_operator=True)
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.url = reverse("admin-settings-retention")

    def test_resident_forbidden(self):
        self.client.force_authenticate(self.resident)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_operator_forbidden(self):
        self.client.force_authenticate(self.operator)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_admin_reads_todays_defaults(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["rainfall_retention_days"], 30)
        self.assertEqual(resp.data["risk_score_retention_days"], 90)


class RetentionPolicyTests(_CacheIsolatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.client.force_authenticate(self.admin)
        self.url = reverse("admin-settings-retention")

    def test_update_persists_and_busts_cache(self):
        resp = self.client.patch(self.url, {"rainfall_retention_days": 14}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(RetentionPolicy.get_solo().rainfall_retention_days, 14)
        self.assertEqual(RetentionPolicy.cached().rainfall_retention_days, 14)

    def test_update_writes_audit_rows(self):
        self.client.patch(self.url, {"rainfall_retention_days": 14}, format="json")
        row = ConfigChangeLog.objects.get(field="rainfall_retention_days")
        self.assertEqual(row.target, "Retention policy")
        self.assertEqual(row.old_value, "30")
        self.assertEqual(row.new_value, "14")
        self.assertEqual(row.actor, self.admin)

    def test_unchanged_field_writes_no_audit_row(self):
        self.client.patch(self.url, {"rainfall_retention_days": 30}, format="json")
        self.assertFalse(ConfigChangeLog.objects.exists())

    def test_zero_window_rejected_by_clean(self):
        resp = self.client.patch(self.url, {"rainfall_retention_days": 0}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("rainfall_retention_days", resp.data)


class RetentionConsumerTests(_CacheIsolatedAPITestCase):
    """The daily cleanup task must honour the edited windows, not the constant."""

    def test_cleanup_uses_policy_windows(self):
        from monitoring.tasks import cleanup_old_data
        from rainfall_fetch.models import Rainfall

        # Narrow the window to 5 days via the singleton (busts the cached read).
        policy = RetentionPolicy.get_solo()
        policy.rainfall_retention_days = 5
        policy.save()

        now = timezone.now()
        Rainfall.objects.create(recorded_at=now - timedelta(days=6))  # outside window
        Rainfall.objects.create(recorded_at=now - timedelta(days=4))  # inside window

        cleanup_old_data()

        # Only the row older than the 5-day window is purged; the default 30 would keep both.
        self.assertEqual(Rainfall.objects.count(), 1)


class OperationalTogglesTests(_CacheIsolatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.client.force_authenticate(self.admin)
        self.url = reverse("admin-settings-toggles")

    def test_toggle_maintenance_mode_on(self):
        resp = self.client.patch(self.url, {"maintenance_mode": True}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(OperationalToggles.cached().maintenance_mode)


class PublicConfigTests(_CacheIsolatedAPITestCase):
    def test_public_config_is_anonymous_and_reflects_org(self):
        OrganizationSettings.objects.update_or_create(
            pk=1, defaults={"org_name": "Zamboanga DRRMO"}
        )
        OrganizationSettings.get_solo().save()  # bust cache
        resp = self.client.get(reverse("public-config"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["org_name"], "Zamboanga DRRMO")
        self.assertIn("announcement_banner", resp.data)
