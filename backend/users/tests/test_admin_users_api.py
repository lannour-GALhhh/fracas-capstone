from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from users.api_views import _is_last_active_admin
from users.models import AccountChange

User = get_user_model()


class AdminUserApiTests(APITestCase):
    def setUp(self):
        self.resident = User.objects.create_user("resident", password="pw")
        self.operator = User.objects.create_user("operator", password="pw", is_operator=True)
        self.admin = User.objects.create_user("admin", password="pw", is_staff=True)
        self.other_admin = User.objects.create_user("admin2", password="pw", is_staff=True)

    def list_url(self):
        return reverse("admin-user-list")

    def detail_url(self, user):
        return reverse("admin-user-detail", args=[user.pk])

    # --- access control -------------------------------------------------

    def test_resident_is_forbidden(self):
        self.client.force_authenticate(self.resident)
        resp = self.client.get(self.list_url())
        self.assertEqual(resp.status_code, 403)

    def test_operator_is_forbidden(self):
        self.client.force_authenticate(self.operator)
        resp = self.client.get(self.list_url())
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_list(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.list_url())
        self.assertEqual(resp.status_code, 200)
        usernames = {row["username"] for row in resp.data["results"]}
        self.assertEqual(usernames, {"operator", "admin", "admin2"})

    # --- resident privacy -------------------------------------------------

    def test_residents_are_never_listed(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.list_url())
        usernames = {row["username"] for row in resp.data["results"]}
        self.assertNotIn("resident", usernames)

    def test_resident_search_finds_nothing(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.list_url(), {"search": "resident"})
        self.assertEqual(resp.data["results"], [])

    def test_resident_role_filter_returns_nothing(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.list_url(), {"role": "resident"})
        self.assertEqual(resp.data["results"], [])

    def test_resident_detail_is_not_reachable(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(self.detail_url(self.resident)).status_code, 404)
        self.assertEqual(
            self.client.patch(self.detail_url(self.resident), {"is_staff": True}).status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                reverse("admin-user-reset-password", args=[self.resident.pk])
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(reverse("admin-user-changes", args=[self.resident.pk])).status_code,
            404,
        )

    def test_demoting_to_resident_removes_from_console(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(self.detail_url(self.operator), {"is_operator": False})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(self.client.get(self.detail_url(self.operator)).status_code, 404)

    # --- filtering --------------------------------------------------------

    def test_search_filters_by_username(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.list_url(), {"search": "operator"})
        usernames = {row["username"] for row in resp.data["results"]}
        self.assertEqual(usernames, {"operator"})

    def test_role_filter(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get(self.list_url(), {"role": "admin"})
        usernames = {row["username"] for row in resp.data["results"]}
        self.assertEqual(usernames, {"admin", "admin2"})

    # --- create -------------------------------------------------------

    def test_admin_can_create_operator(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(
            self.list_url(),
            {
                "username": "newop",
                "password": "correct-horse-battery-staple",
                "first_name": "New",
                "last_name": "Op",
                "is_operator": True,
            },
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        user = User.objects.get(username="newop")
        self.assertTrue(user.is_operator)
        self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password("correct-horse-battery-staple"))

    def test_create_cannot_set_superuser(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(
            self.list_url(),
            {
                "username": "sneaky",
                "password": "correct-horse-battery-staple",
                "is_operator": True,
                "is_superuser": True,
            },
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertFalse(User.objects.get(username="sneaky").is_superuser)

    def test_cannot_create_a_resident(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(
            self.list_url(),
            {"username": "newresident", "password": "correct-horse-battery-staple"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.filter(username="newresident").exists())

    # --- update / guardrails -----------------------------------------

    def test_admin_can_promote_operator(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(self.detail_url(self.operator), {"is_staff": True})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.operator.refresh_from_db()
        self.assertTrue(self.operator.is_staff)
        self.assertTrue(
            AccountChange.objects.filter(
                user=self.operator, field="is_staff", actor=self.admin
            ).exists()
        )

    def test_last_active_admin_helper(self):
        # With IsAdmin gating the endpoint, the only account that can ever act
        # on "the last admin" is that admin itself (self-lockout, tested
        # below) — so the last-admin guardrail's own accounting is verified
        # directly here rather than through an unreachable API scenario.
        self.other_admin.delete()
        self.assertTrue(_is_last_active_admin(self.admin))
        User.objects.create_user("third", password="pw", is_staff=True)
        self.assertFalse(_is_last_active_admin(self.admin))

    def test_admin_cannot_demote_self(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(self.detail_url(self.admin), {"is_staff": False})
        self.assertEqual(resp.status_code, 403)

    def test_admin_cannot_deactivate_self(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(self.detail_url(self.admin), {"is_active": False})
        self.assertEqual(resp.status_code, 403)

    def test_is_superuser_not_editable(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(self.detail_url(self.operator), {"is_superuser": True})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.operator.refresh_from_db()
        self.assertFalse(self.operator.is_superuser)

    # --- reset password -------------------------------------------------

    def test_reset_password_rotates_and_logs(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(reverse("admin-user-reset-password", args=[self.operator.pk]))
        self.assertEqual(resp.status_code, 200)
        new_password = resp.data["password"]
        self.operator.refresh_from_db()
        self.assertTrue(self.operator.check_password(new_password))
        self.assertTrue(
            AccountChange.objects.filter(
                user=self.operator,
                action=AccountChange.Action.PASSWORD_CHANGED,
                actor=self.admin,
            ).exists()
        )

    # --- per-user audit trail --------------------------------------------

    def test_changes_action_scoped_to_user(self):
        self.client.force_authenticate(self.admin)
        self.client.patch(self.detail_url(self.operator), {"first_name": "Changed"})
        resp = self.client.get(reverse("admin-user-changes", args=[self.operator.pk]))
        self.assertEqual(resp.status_code, 200)
        rows = resp.data["results"] if "results" in resp.data else resp.data
        self.assertTrue(any(row["field"] == "first_name" for row in rows))
