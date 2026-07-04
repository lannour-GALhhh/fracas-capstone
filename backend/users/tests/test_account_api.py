from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.urls import reverse
from rest_framework.test import APITestCase

from barangays.models import Barangay
from users.models import AccountChange, Device, Subscription


def make_barangay(name="Tumaga", code="T1"):
    poly = Polygon(((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)))
    return Barangay.objects.create(
        name=name, code=code, province_code="PH0907332", boundary=MultiPolygon(poly)
    )


class AccountApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("resident", password="pw")
        self.barangay = make_barangay()
        self.client.force_authenticate(self.user)

    def test_subscribe_is_idempotent(self):
        url = reverse("subscription-list")
        self.assertEqual(self.client.post(url, {"barangay": self.barangay.id}).status_code, 201)
        self.client.post(url, {"barangay": self.barangay.id})  # again
        self.assertEqual(Subscription.objects.filter(user=self.user).count(), 1)

    def test_subscriptions_are_user_scoped(self):
        other = get_user_model().objects.create_user("other", password="pw")
        Subscription.objects.create(user=other, barangay=self.barangay)
        resp = self.client.get(reverse("subscription-list"))
        self.assertEqual(resp.data["count"], 0)

    def test_register_device_upserts_token(self):
        url = reverse("device-list")
        self.client.post(url, {"token": "tok-1", "platform": "android"})
        self.client.post(url, {"token": "tok-1", "platform": "ios"})  # same token
        self.assertEqual(Device.objects.filter(token="tok-1").count(), 1)
        self.assertEqual(Device.objects.get(token="tok-1").platform, "ios")

    def test_preferences_get_and_update(self):
        url = reverse("notification-preferences")
        self.assertEqual(self.client.get(url).status_code, 200)
        resp = self.client.patch(url, {"sms_enabled": False})
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["sms_enabled"])


class CurrentUserApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            "operator", password="pw", is_operator=True, first_name="Ops", last_name="Lead"
        )
        self.client.force_authenticate(self.user)

    def test_me_exposes_profile_and_role(self):
        resp = self.client.get(reverse("user-me"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["first_name"], "Ops")
        self.assertEqual(resp.data["role"], "operator")  # derived, read-only
        self.assertEqual(resp.data["username"], "operator")

    def test_me_updates_editable_fields(self):
        resp = self.client.patch(
            reverse("user-me"), {"first_name": "Renamed", "email": "ops@drrmo.gov"}
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Renamed")
        self.assertEqual(self.user.email, "ops@drrmo.gov")

    def test_me_cannot_self_promote_role(self):
        # `role` is read-only: PATCHing it must not touch the underlying flags.
        self.client.patch(reverse("user-me"), {"role": "admin"})
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)

    def test_set_password_changes_credentials(self):
        resp = self.client.post(
            reverse("user-set-password"),
            {"current_password": "pw", "new_password": "n3w-passphrase"},
        )
        self.assertEqual(resp.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("n3w-passphrase"))

    def test_me_updates_phone_and_address(self):
        resp = self.client.patch(
            reverse("user-me"),
            {
                "phone_number": "+639170000001",
                "address": {
                    "unit": "Purok 5",
                    "barangay": "Tetuan",
                    "barangay_code": "097332075",
                    "city": "City of Zamboanga",
                    "city_code": "097332000",
                    "province": "Zamboanga Del Sur",
                    "province_code": "097300000",
                    "zip_code": "7000",
                },
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone_number, "+639170000001")
        self.assertEqual(self.user.address["barangay"], "Tetuan")
        self.assertEqual(self.user.address["city_code"], "097332000")
        # Country defaults to Philippines when omitted.
        self.assertEqual(self.user.address["country"], "Philippines")

    def test_address_edit_writes_one_account_change(self):
        self.client.patch(
            reverse("user-me"),
            {"address": {"unit": "Purok 5", "barangay": "Tetuan"}},
            format="json",
        )
        change = AccountChange.objects.get(user=self.user, field="address")
        self.assertEqual(change.old_value, "")
        self.assertIn("Tetuan", change.new_value)

    def test_profile_edit_writes_account_change(self):
        self.client.patch(reverse("user-me"), {"first_name": "Renamed"})
        change = AccountChange.objects.get(user=self.user, field="first_name")
        self.assertEqual(change.action, AccountChange.Action.UPDATED)
        self.assertEqual(change.old_value, "Ops")
        self.assertEqual(change.new_value, "Renamed")
        self.assertEqual(change.actor, self.user)

    def test_set_password_logs_change(self):
        self.client.post(
            reverse("user-set-password"),
            {"current_password": "pw", "new_password": "n3w-passphrase"},
        )
        self.assertTrue(
            AccountChange.objects.filter(
                user=self.user, action=AccountChange.Action.PASSWORD_CHANGED
            ).exists()
        )


class AccountChangeApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("me", password="pw")
        self.other = get_user_model().objects.create_user("other", password="pw")
        self.url = reverse("account-changes")

    def test_requires_auth(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_lists_only_own_changes_newest_first(self):
        AccountChange.objects.create(user=self.other, field="email")
        older = AccountChange.objects.create(user=self.user, field="first_name")
        newer = AccountChange.objects.create(user=self.user, field="last_name")
        self.client.force_authenticate(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([row["id"] for row in resp.data["results"]], [newer.id, older.id])
