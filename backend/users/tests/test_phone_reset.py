from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from users.models import PhoneOTP, User
from users.tasks import send_otp_sms_task

REQUEST = "/api/auth/password-reset/phone/"
VERIFY = "/api/auth/password-reset/phone/verify/"
CONFIRM = "/api/auth/password-reset/confirm/"
PHONE = "+639171234567"
GOOD = "correct-horse-battery-staple"


class PhoneResetTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user("r1", phone_number=PHONE, password="old-pass-123")

    @patch("users.tasks.send_otp_sms_task.delay")
    def test_request_queues_sms_with_code(self, delay):
        resp = self.client.post(REQUEST, {"phone_number": "0917 123 4567"})
        self.assertEqual(resp.status_code, 200)
        code = PhoneOTP.objects.get(user=self.user).code
        delay.assert_called_once()
        to, message = delay.call_args.args
        self.assertEqual(to, PHONE)
        self.assertIn(code, message)
        self.assertIn("password reset", message)

    @patch("users.tasks.send_otp_sms_task.delay")
    def test_unknown_inactive_and_invalid_numbers_get_same_answer_and_send_nothing(self, delay):
        User.objects.create_user("r2", phone_number="+639181234567", password="x", is_active=False)
        answers = [
            self.client.post(REQUEST, {"phone_number": n}).data
            for n in ("09999999999", "09181234567", "nonsense")
        ]
        self.assertEqual(answers[0], answers[1])
        self.assertEqual(answers[1], answers[2])
        delay.assert_not_called()

    @patch("users.tasks.send_otp_sms_task.delay")
    def test_resend_cooldown_is_silent(self, delay):
        for _ in range(2):
            self.assertEqual(self.client.post(REQUEST, {"phone_number": PHONE}).status_code, 200)
        delay.assert_called_once()

    @patch("users.tasks.send_otp_sms_task.delay")
    def test_full_flow_changes_password_and_code_is_single_use(self, _delay):
        self.client.post(REQUEST, {"phone_number": PHONE})
        code = PhoneOTP.objects.get(user=self.user).code
        resp = self.client.post(VERIFY, {"phone_number": PHONE, "code": code})
        self.assertEqual(resp.status_code, 200)
        done = self.client.post(CONFIRM, {**resp.data, "new_password": GOOD})
        self.assertEqual(done.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(GOOD))
        self.assertEqual(self.client.post(VERIFY, {"phone_number": PHONE, "code": code}).status_code, 400)

    @patch("users.tasks.send_otp_sms_task.delay")
    def test_wrong_code_locks_out_after_max_attempts(self, _delay):
        self.client.post(REQUEST, {"phone_number": PHONE})
        code = PhoneOTP.objects.get(user=self.user).code
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            self.assertEqual(self.client.post(VERIFY, {"phone_number": PHONE, "code": wrong}).status_code, 400)
        locked = self.client.post(VERIFY, {"phone_number": PHONE, "code": code})
        self.assertEqual(locked.status_code, 400)
        self.assertIn("Too many", locked.data["detail"])

    @override_settings(OTP_BYPASS_CODE="123456")
    def test_dev_bypass_code_does_not_work_for_reset(self):
        resp = self.client.post(VERIFY, {"phone_number": PHONE, "code": "123456"})
        self.assertEqual(resp.status_code, 400)

    @patch("users.tasks.get_sms_provider")
    def test_task_sends_through_provider(self, provider):
        send_otp_sms_task(PHONE, "hello")
        provider.return_value.send.assert_called_once_with(PHONE, "hello")
