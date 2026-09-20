"""Registration & Account Policy settings endpoint and its consumers."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APITestCase

from users.models import PhoneOTP, RegistrationPolicy
from users.services.otp import generate_and_send

User = get_user_model()


class _CacheIsolatedAPITestCase(APITestCase):
    """Redis persists across tests; keep singleton `.cached()` reads isolated."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)


class RegistrationPolicyApiTests(_CacheIsolatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.resident = User.objects.create_user("resident", password="pw")
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.url = reverse("admin-settings-registration")

    def test_resident_forbidden(self):
        self.client.force_authenticate(self.resident)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_defaults(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.url)
        self.assertTrue(resp.data["self_registration_enabled"])
        self.assertEqual(resp.data["otp_ttl_minutes"], 10)

    def test_zero_ttl_rejected(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(self.url, {"otp_ttl_minutes": 0}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("otp_ttl_minutes", resp.data)


class SelfRegistrationGateTests(_CacheIsolatedAPITestCase):
    def test_registration_blocked_when_disabled(self):
        policy = RegistrationPolicy.get_solo()
        policy.self_registration_enabled = False
        policy.save()
        # The gate is checked before serializer validation, so an empty body still 403s.
        resp = self.client.post(reverse("register-start"), {}, format="json")
        self.assertEqual(resp.status_code, 403)


class OtpTtlConsumerTests(_CacheIsolatedAPITestCase):
    def test_otp_expiry_honours_policy_ttl(self):
        user = User.objects.create_user(
            "resident", password="pw", phone_number="+639170000001"
        )
        policy = RegistrationPolicy.get_solo()
        policy.otp_ttl_minutes = 3
        policy.save()

        before = timezone.now()
        generate_and_send(user)  # console SMS provider, no network
        otp = PhoneOTP.objects.get(user=user)
        ttl_seconds = (otp.expires_at - before).total_seconds()
        # ~3 minutes, clearly not the 10-minute default.
        self.assertGreater(ttl_seconds, 150)
        self.assertLess(ttl_seconds, 200)
