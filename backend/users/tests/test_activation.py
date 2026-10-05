from unittest.mock import MagicMock, patch

from django.core import mail, signing
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from backend.email_backend import BrevoEmailBackend, BrevoError
from users.models import AccountChange, User
from users.services import activation
from users.tasks import send_activation_email_task

VERIFY = "/api/auth/account-activation/verify/"
COMPLETE = "/api/auth/account-activation/"
LOGIN = "/api/auth/jwt/create/"
GOOD_PASSWORD = "correct-horse-battery-staple"


def make_pending():
    return activation.create_pending_user(
        first_name="Ana", last_name="Cruz", email="ana@example.com", is_operator=True
    )


class ServiceTests(TestCase):
    def test_username_is_folded_and_numbered(self):
        self.assertEqual(activation.generate_username("José Maria", "de la Cruz"), "jose_maria_de_la_cruz")
        User.objects.create_user("ana_cruz", password="x")
        self.assertEqual(activation.generate_username("Ana", "Cruz"), "ana_cruz2")

    def test_temp_password_is_8_alphanumeric(self):
        for _ in range(20):
            pw = activation.generate_temp_password()
            self.assertEqual(len(pw), 8)
            self.assertTrue(pw.isalnum())

    def test_token_expires(self):
        _, token = make_pending()
        with override_settings(ACTIVATION_LINK_TTL=-1):
            with self.assertRaises(activation.ActivationError):
                activation.resolve(token)

    def test_tampered_or_garbage_token_rejected(self):
        _, token = make_pending()
        for bad in (token[:-2] + "xx", "garbage", ""):
            with self.assertRaises(activation.ActivationError):
                activation.resolve(bad)

    def test_token_with_wrong_temp_password_rejected(self):
        user, _ = make_pending()
        forged = activation.make_token(user.username, "wrongpass")
        with self.assertRaises(activation.ActivationError):
            activation.resolve(forged)

    def test_token_signed_with_other_salt_rejected(self):
        user, _ = make_pending()
        other = signing.dumps({"u": user.username, "p": "x"}, salt="something-else")
        with self.assertRaises(activation.ActivationError):
            activation.resolve(other)


@override_settings(FRONTEND_URL="https://fracas.test/")
class EmailTests(TestCase):
    def test_email_has_button_link(self):
        user, token = make_pending()
        activation.send_activation_email(user, token)
        msg = mail.outbox[0]
        self.assertEqual(msg.to, ["ana@example.com"])
        link = f"https://fracas.test/account-activation/{token}"
        self.assertIn(link, msg.body)
        html = msg.alternatives[0][0]
        self.assertIn("Activate account", html)

    def test_task_skips_activated_user(self):
        user, token = make_pending()
        user.is_activated = True
        user.save()
        send_activation_email_task(user.pk, token)
        self.assertEqual(mail.outbox, [])


class TaskRetryTests(TestCase):
    def setUp(self):
        self.user, self.token = make_pending()

    def test_permanent_brevo_error_is_not_retried(self):
        with patch("users.tasks.activation.send_activation_email", side_effect=BrevoError("no", True)):
            with patch.object(send_activation_email_task, "retry") as retry:
                with self.assertRaises(BrevoError):
                    send_activation_email_task(self.user.pk, self.token)
        retry.assert_not_called()

    def test_transient_error_is_retried(self):
        with patch("users.tasks.activation.send_activation_email", side_effect=BrevoError("busy", False)):
            with patch.object(send_activation_email_task, "retry", side_effect=RuntimeError("retried")) as retry:
                with self.assertRaises(RuntimeError):
                    send_activation_email_task(self.user.pk, self.token)
        retry.assert_called_once()


class ActivationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user, self.token = make_pending()
        self.temp = None

    def _temp_password(self):
        return signing.loads(self.token, salt=activation.SALT)["p"]

    def login(self, username, password):
        return self.client.post(LOGIN, {"username": username, "password": password}, format="json")

    def test_pending_account_cannot_log_in_even_with_correct_temp_password(self):
        resp = self.login(self.user.username, self._temp_password())
        self.assertEqual(resp.status_code, 401)

    def test_pending_and_wrong_password_responses_are_identical(self):
        pending = self.login(self.user.username, self._temp_password())
        wrong = self.login(self.user.username, "not-the-password")
        missing = self.login("nobody", "whatever")
        self.assertEqual(pending.status_code, wrong.status_code)
        self.assertEqual(pending.json(), wrong.json())
        self.assertEqual(pending.json(), missing.json())

    def test_verify_returns_suggested_username(self):
        resp = self.client.post(VERIFY, {"token": self.token}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["suggested_username"], "ana_cruz")

    def test_verify_rejects_bad_token(self):
        resp = self.client.post(VERIFY, {"token": "nope"}, format="json")
        self.assertEqual(resp.status_code, 400)

    def complete(self, **overrides):
        data = {"token": self.token, "username": "ana.cruz", "new_password": GOOD_PASSWORD}
        return self.client.post(COMPLETE, {**data, **overrides}, format="json")

    def test_full_flow_activates_with_chosen_username_and_kills_link(self):
        resp = self.complete()
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_activated)
        self.assertEqual(self.user.username, "ana.cruz")
        self.assertEqual(self.login("ana.cruz", GOOD_PASSWORD).status_code, 200)
        # Neither the generated username nor the temporary password work any more.
        self.assertEqual(self.login("ana_cruz", GOOD_PASSWORD).status_code, 401)
        self.assertEqual(self.login("ana.cruz", self._temp_password()).status_code, 401)
        # Single-use: the same link no longer verifies or completes.
        self.assertEqual(self.client.post(VERIFY, {"token": self.token}, format="json").status_code, 400)
        self.assertEqual(self.complete(username="other_name").status_code, 400)
        self.assertTrue(
            AccountChange.objects.filter(user=self.user, action=AccountChange.Action.PASSWORD_CHANGED).exists()
        )

    def test_login_records_last_login(self):
        self.complete()
        self.assertIsNone(User.objects.get(pk=self.user.pk).last_login)
        self.login("ana.cruz", GOOD_PASSWORD)
        self.assertIsNotNone(User.objects.get(pk=self.user.pk).last_login)

    def test_keeping_the_suggested_username_is_allowed(self):
        self.assertEqual(self.complete(username="ana_cruz").status_code, 200)

    def test_taken_username_rejected_case_insensitively(self):
        User.objects.create_user("Taken_Name", password="x")
        resp = self.complete(username="taken_name")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("username", resp.json())
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_activated)

    def test_invalid_or_short_username_rejected(self):
        for bad in ("ab", "has space", "", "bad/char"):
            resp = self.complete(username=bad)
            self.assertEqual(resp.status_code, 400, bad)
            self.assertIn("username", resp.json())

    def test_errors_for_both_fields_reported_together(self):
        resp = self.complete(username="ab", new_password="123")
        self.assertEqual(set(resp.json()), {"username", "new_password"})

    def test_weak_password_rejected_and_account_stays_pending(self):
        resp = self.complete(new_password="123")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("new_password", resp.json())
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_activated)

    def test_deactivated_pending_user_cannot_activate(self):
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.complete().status_code, 400)

    def test_existing_accounts_still_log_in(self):
        User.objects.create_user("legacy", password=GOOD_PASSWORD)
        self.assertEqual(self.login("legacy", GOOD_PASSWORD).status_code, 200)


@override_settings(BREVO_API_KEY="key-123", DEFAULT_FROM_EMAIL="FRACAS <no-reply@fracas.test>")
class BrevoBackendTests(SimpleTestCase):
    def _message(self):
        msg = mail.EmailMultiAlternatives("Hi", "plain", to=["Ana <ana@example.com>"])
        msg.attach_alternative("<b>html</b>", "text/html")
        return msg

    @patch("backend.email_backend.requests.post")
    def test_posts_payload_to_brevo(self, post):
        post.return_value = MagicMock()
        sent = BrevoEmailBackend().send_messages([self._message()])
        self.assertEqual(sent, 1)
        _, kwargs = post.call_args
        self.assertEqual(kwargs["headers"]["api-key"], "key-123")
        body = kwargs["json"]
        self.assertEqual(body["sender"], {"name": "FRACAS", "email": "no-reply@fracas.test"})
        self.assertEqual(body["to"], [{"name": "Ana", "email": "ana@example.com"}])
        self.assertEqual(body["htmlContent"], "<b>html</b>")
        self.assertEqual(body["textContent"], "plain")

    @patch("backend.email_backend.requests.post")
    def test_http_error_carries_brevo_message_and_permanence(self, post):
        for status, permanent in ((401, True), (400, True), (429, False), (503, False)):
            post.return_value = MagicMock(ok=False, status_code=status, text="unrecognised IP")
            with self.assertRaises(BrevoError) as ctx:
                BrevoEmailBackend().send_messages([self._message()])
            self.assertIn("unrecognised IP", str(ctx.exception))
            self.assertEqual(ctx.exception.permanent, permanent, status)

    @patch("backend.email_backend.requests.post", side_effect=RuntimeError("boom"))
    def test_failure_raises_unless_silent(self, _post):
        with self.assertRaises(RuntimeError):
            BrevoEmailBackend().send_messages([self._message()])
        self.assertEqual(BrevoEmailBackend(fail_silently=True).send_messages([self._message()]), 0)

    @override_settings(BREVO_API_KEY="")
    def test_missing_key_is_an_error(self):
        with self.assertRaises(ValueError):
            BrevoEmailBackend().send_messages([self._message()])
