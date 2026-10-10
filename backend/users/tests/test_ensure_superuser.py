"""ensure_superuser: env-driven, idempotent first-admin bootstrap."""

import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

User = get_user_model()

ENV = {
    "FRACAS_ADMIN_USERNAME": "boss",
    "FRACAS_ADMIN_PASSWORD": "pw-123456",
    "FRACAS_ADMIN_EMAIL": "boss@example.com",
}


def run():
    call_command("ensure_superuser", stdout=StringIO())


class EnsureSuperuserTests(TestCase):
    def test_creates_admin_from_env(self):
        with patch.dict(os.environ, ENV):
            run()
        user = User.objects.get(username="boss")
        self.assertTrue(user.is_superuser and user.is_staff)
        self.assertEqual(user.email, "boss@example.com")
        self.assertTrue(user.check_password("pw-123456"))
        self.assertEqual(user.role, "admin")

    def test_skips_when_env_missing(self):
        with patch.dict(os.environ, {}, clear=False):
            for k in ENV:
                os.environ.pop(k, None)
            run()
        self.assertFalse(User.objects.exists())

    def test_existing_user_is_not_modified(self):
        User.objects.create_user("boss", password="original")
        with patch.dict(os.environ, ENV):
            run()
        user = User.objects.get(username="boss")
        self.assertTrue(user.check_password("original"))
        self.assertFalse(user.is_superuser)
