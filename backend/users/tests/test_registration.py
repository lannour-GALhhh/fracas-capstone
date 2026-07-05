from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from users.models import PhoneOTP
from users.services import registration
from users.services.registration import RegistrationError, normalize_phone

User = get_user_model()


class NormalizePhoneTests(APITestCase):
    def test_accepts_common_formats(self):
        for raw in ["09171234567", "9171234567", "639171234567", "+639171234567", "0917 123 4567"]:
            self.assertEqual(normalize_phone(raw), "+639171234567")

    def test_rejects_bad_numbers(self):
        for raw in ["12345", "08171234567", "+1 555 0100", ""]:
            with self.assertRaises(RegistrationError):
                normalize_phone(raw)


class RegistrationFlowTests(APITestCase):
    PHONE = "09171234567"
    NORM = "+639171234567"

    def _start(self):
        return self.client.post(
            reverse("register-start"),
            {"phone_number": self.PHONE, "address": {"barangay_code": "PH0907332001"}},
            format="json",
        )

    def _code(self):
        return PhoneOTP.objects.filter(user__phone_number=self.NORM).latest("created_at").code

    def test_full_flow_creates_active_account(self):
        self.assertEqual(self._start().status_code, 200)
        user = User.objects.get(phone_number=self.NORM)
        self.assertFalse(user.is_active)
        self.assertEqual(user.username, self.NORM)
        self.assertEqual(user.address["barangay_code"], "PH0907332001")

        verify = self.client.post(
            reverse("register-verify"), {"phone_number": self.PHONE, "code": self._code()}, format="json"
        )
        self.assertEqual(verify.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.phone_verified)
        self.assertIsNotNone(user.terms_accepted_at)
        self.assertFalse(user.is_active)  # still not active until password set

        setpw = self.client.post(
            reverse("register-set-password"),
            {"phone_number": self.PHONE, "password": "abc123"},
            format="json",
        )
        self.assertEqual(setpw.status_code, 201)
        self.assertIn("access", setpw.data)
        self.assertIn("refresh", setpw.data)  # mobile gets the refresh in the body
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_login_by_phone_after_registration(self):
        registration.start(self.PHONE, {})
        registration.verify_code(self.PHONE, self._code())
        registration.set_password(self.PHONE, "abc123")
        resp = self.client.post(
            "/api/auth/jwt/create/", {"username": self.NORM, "password": "abc123"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)

    def test_start_rejects_existing_active_account(self):
        User.objects.create_user(self.NORM, password="pw", phone_number=self.NORM)
        self.assertEqual(self._start().status_code, 400)

    def test_verify_rejects_wrong_code(self):
        self._start()
        resp = self.client.post(
            reverse("register-verify"), {"phone_number": self.PHONE, "code": "000000"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.get(phone_number=self.NORM).phone_verified)

    def test_set_password_requires_verification(self):
        self._start()  # started but not verified
        resp = self.client.post(
            reverse("register-set-password"),
            {"phone_number": self.PHONE, "password": "abc123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_lenient_password_accepts_six_chars(self):
        # Old policy blocked short/all-numeric/common passwords; the new one allows 6+ chars.
        registration.start(self.PHONE, {})
        registration.verify_code(self.PHONE, self._code())
        resp = self.client.post(
            reverse("register-set-password"),
            {"phone_number": self.PHONE, "password": "654321"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)

    def test_short_password_rejected(self):
        registration.start(self.PHONE, {})
        registration.verify_code(self.PHONE, self._code())
        resp = self.client.post(
            reverse("register-set-password"),
            {"phone_number": self.PHONE, "password": "abc"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_endpoints_are_anonymous(self):
        # No auth on the client — the flow must work for a not-yet-registered user.
        self.assertEqual(self._start().status_code, 200)
