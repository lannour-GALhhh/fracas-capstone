"""External-cron endpoints: secret gate, job dispatch, overlap lock."""

from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from monitoring.services import cron

SECRET = "s3cret-value"


def _inline(target):
    target()


@override_settings(CRON_SECRET=SECRET)
class CronEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("cron-job", kwargs={"job": "pipeline"})

    def test_missing_key_forbidden(self):
        self.assertEqual(self.client.post(self.url).status_code, 403)

    def test_wrong_key_forbidden(self):
        resp = self.client.post(self.url, HTTP_X_CRON_KEY="nope")
        self.assertEqual(resp.status_code, 403)

    @override_settings(CRON_SECRET="")
    def test_disabled_when_secret_unset(self):
        resp = self.client.post(self.url, HTTP_X_CRON_KEY="")
        self.assertEqual(resp.status_code, 404)

    def test_get_not_allowed(self):
        self.assertEqual(self.client.get(self.url, HTTP_X_CRON_KEY=SECRET).status_code, 405)

    def test_unknown_job_404(self):
        url = reverse("cron-job", kwargs={"job": "nope"})
        self.assertEqual(self.client.post(url, HTTP_X_CRON_KEY=SECRET).status_code, 404)

    def test_valid_key_runs_job_and_releases_lock(self):
        calls = []
        with patch.dict(cron.JOBS, {"pipeline": lambda: calls.append(1)}), \
             patch.object(cron, "_spawn", _inline):
            resp = self.client.post(self.url, HTTP_X_CRON_KEY=SECRET)
        self.assertEqual(resp.status_code, 202)
        self.assertEqual(calls, [1])
        self.assertIsNone(cache.get(cron._lock_key("pipeline")))

    def test_overlapping_run_is_skipped(self):
        cache.set(cron._lock_key("pipeline"), 1, 60)
        calls = []
        with patch.dict(cron.JOBS, {"pipeline": lambda: calls.append(1)}), \
             patch.object(cron, "_spawn", _inline):
            resp = self.client.post(self.url, HTTP_X_CRON_KEY=SECRET)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "already_running")
        self.assertEqual(calls, [])

    def test_failing_job_still_releases_lock(self):
        def boom():
            raise RuntimeError("x")
        with patch.dict(cron.JOBS, {"pipeline": boom}), patch.object(cron, "_spawn", _inline):
            self.client.post(self.url, HTTP_X_CRON_KEY=SECRET)
        self.assertIsNone(cache.get(cron._lock_key("pipeline")))


class ScheduleTests(APITestCase):
    def test_schedule_matches_registered_jobs(self):
        from backend.schedules import CRON_SCHEDULE

        self.assertEqual(set(CRON_SCHEDULE), set(cron.JOBS))
