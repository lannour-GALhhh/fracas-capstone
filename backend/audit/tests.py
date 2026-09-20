"""Tests for the shared admin-console infrastructure."""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase

from audit.models import ConfigChangeLog
from audit.services import log_change, log_field_diffs

from monitoring.models import RetentionPolicy

User = get_user_model()


class SingletonModelTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)

    def test_get_solo_is_always_pk_1(self):
        a = RetentionPolicy.get_solo()
        b = RetentionPolicy.get_solo()
        self.assertEqual(a.pk, 1)
        self.assertEqual(a.pk, b.pk)
        self.assertEqual(RetentionPolicy.objects.count(), 1)

    def test_save_forces_pk_1(self):
        policy = RetentionPolicy(rainfall_retention_days=15)
        policy.save()
        self.assertEqual(policy.pk, 1)
        self.assertEqual(RetentionPolicy.objects.count(), 1)

    def test_cached_read_and_bust_on_save(self):
        cache.delete(RetentionPolicy._cache_key())
        first = RetentionPolicy.cached()
        self.assertEqual(first.rainfall_retention_days, 30)  # today's default

        # A save must bust the cache so hot-path consumers never read stale config.
        solo = RetentionPolicy.get_solo()
        solo.rainfall_retention_days = 7
        solo.save()
        self.assertEqual(RetentionPolicy.cached().rainfall_retention_days, 7)


class LogHelperTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user("admin", password="pw", is_staff=True)

    def test_log_change_records_row(self):
        log_change(self.actor, "System ops", action="pipeline_run")
        row = ConfigChangeLog.objects.get()
        self.assertEqual(row.actor, self.actor)
        self.assertEqual(row.target, "System ops")
        self.assertEqual(row.action, "pipeline_run")

    def test_log_change_anonymous_actor_is_null(self):
        class Anon:
            is_authenticated = False

        log_change(Anon(), "System ops", action="retention_run")
        self.assertIsNone(ConfigChangeLog.objects.get().actor)

    def test_log_field_diffs_only_writes_changed_fields(self):
        before = {"a": 1, "b": "x"}
        after = {"a": 2, "b": "x"}  # only `a` changed
        log_field_diffs(self.actor, "Retention policy", before, after)
        rows = ConfigChangeLog.objects.all()
        self.assertEqual(rows.count(), 1)
        row = rows.get()
        self.assertEqual(row.field, "a")
        self.assertEqual(row.old_value, "1")
        self.assertEqual(row.new_value, "2")
