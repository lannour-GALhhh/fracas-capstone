from unittest.mock import patch

from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from users.models import AccountChange, User
from users.services import password_reset
from users.tasks import send_password_reset_email_task

REQUEST = "/api/auth/password-reset/"
CONFIRM = "/api/auth/password-reset/confirm/"
GOOD_PASSWORD = "correct-horse-battery-staple"


def make_user(**kw):
    return User.objects.create_user("ana", email="ana@example.com", password="old-pass-123", **kw)


class PasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("users.password_reset_views.send_password_reset_email_task.delay")
    def test_request_queues_email_for_known_address(self, delay):
        user = make_user()
        resp = self.client.post(REQUEST, {"email": "ANA@example.com"})
        self.assertEqual(resp.status_code, 200)
        delay.assert_called_once_with(user.pk)

    @patch("users.password_reset_views.send_password_reset_email_task.delay")
    def test_unknown_email_gets_same_answer_and_sends_nothing(self, delay):
        known = self.client.post(REQUEST, {"email": "nobody@example.com"})
        make_user()
        other = self.client.post(REQUEST, {"email": "ana@example.com"})
        self.assertEqual(known.data, other.data)
        delay.assert_called_once()

    @patch("users.password_reset_views.send_password_reset_email_task.delay")
    def test_pending_and_inactive_accounts_are_skipped(self, delay):
        make_user(is_activated=False)
        User.objects.create_user("bo", email="bo@example.com", password="x", is_active=False)
        self.client.post(REQUEST, {"email": "ana@example.com"})
        self.client.post(REQUEST, {"email": "bo@example.com"})
        delay.assert_not_called()

    def test_email_task_sends_link(self):
        user = make_user()
        send_password_reset_email_task(user.pk)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/reset-password/", mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].to, ["ana@example.com"])

    def test_confirm_sets_password_logs_it_and_link_is_single_use(self):
        user = make_user()
        uid, token = password_reset.make_link_params(user)
        resp = self.client.post(CONFIRM, {"uid": uid, "token": token, "new_password": GOOD_PASSWORD})
        self.assertEqual(resp.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password(GOOD_PASSWORD))
        self.assertTrue(AccountChange.objects.filter(user=user, action=AccountChange.Action.PASSWORD_CHANGED).exists())
        again = self.client.post(CONFIRM, {"uid": uid, "token": token, "new_password": "another-Pass-987"})
        self.assertEqual(again.status_code, 400)

    def test_weak_password_rejected_and_link_still_valid(self):
        user = make_user()
        uid, token = password_reset.make_link_params(user)
        resp = self.client.post(CONFIRM, {"uid": uid, "token": token, "new_password": "123"})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.data)
        user.refresh_from_db()
        self.assertTrue(user.check_password("old-pass-123"))

    def test_garbage_link_rejected(self):
        make_user()
        for uid, token in (("", ""), ("zzz", "abc-def"), ("MQ", "bad-token")):
            resp = self.client.post(CONFIRM, {"uid": uid, "token": token, "new_password": GOOD_PASSWORD})
            self.assertEqual(resp.status_code, 400)
