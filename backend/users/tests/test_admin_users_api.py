from unittest.mock import patch

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

    PAYLOAD = {"first_name": "New", "last_name": "Op", "email": "newop@example.com"}

    def test_admin_can_create_pending_operator(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(self.list_url(), self.PAYLOAD)
        self.assertEqual(resp.status_code, 201, resp.data)
        user = User.objects.get(pk=resp.data["id"])
        self.assertEqual(user.username, "new_op")
        self.assertTrue(user.is_operator)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_activated)
        self.assertTrue(user.has_usable_password())
        self.assertEqual(resp.data["status"], "pending")

    def test_status_follows_activation_not_last_login(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url(), self.PAYLOAD)
        user = User.objects.get(pk=created.data["id"])
        listed = lambda status: {  # noqa: E731
            r["id"] for r in self.client.get(self.list_url(), {"status": status}).data["results"]
        }
        self.assertIn(user.pk, listed("pending"))
        self.assertNotIn(user.pk, listed("active"))
        user.is_activated = True
        user.save()  # activated but has never signed in
        self.assertEqual(self.client.get(self.detail_url(user)).data["status"], "active")
        self.assertIn(user.pk, listed("active"))
        self.assertNotIn(user.pk, listed("pending"))

    def test_username_collision_is_numbered(self):
        self.client.force_authenticate(self.admin)
        self.client.post(self.list_url(), self.PAYLOAD)
        resp = self.client.post(self.list_url(), {**self.PAYLOAD, "email": "other@example.com"})
        self.assertEqual(resp.data["username"], "new_op2")

    def test_all_identity_fields_required_and_email_unique(self):
        self.client.force_authenticate(self.admin)
        for missing in ("first_name", "last_name", "email"):
            data = {k: v for k, v in self.PAYLOAD.items() if k != missing}
            self.assertEqual(self.client.post(self.list_url(), data).status_code, 400, missing)
        self.client.post(self.list_url(), self.PAYLOAD)
        dup = self.client.post(self.list_url(), {**self.PAYLOAD, "first_name": "Dup"})
        self.assertEqual(dup.status_code, 400)

    def test_create_queues_activation_email(self):
        self.client.force_authenticate(self.admin)
        with patch("users.api_views.send_activation_email_task.delay") as delay:
            with self.captureOnCommitCallbacks(execute=True):
                resp = self.client.post(self.list_url(), self.PAYLOAD)
        self.assertEqual(resp.status_code, 201, resp.data)
        pk, token = delay.call_args.args
        self.assertEqual(pk, resp.data["id"])
        self.assertTrue(token)

    def test_create_cannot_set_superuser_or_activation(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(
            self.list_url(), {**self.PAYLOAD, "is_superuser": True, "is_activated": True}
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        user = User.objects.get(pk=resp.data["id"])
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_activated)

    def test_cannot_create_a_resident(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(
            self.list_url(), {**self.PAYLOAD, "is_operator": False, "is_staff": False}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.filter(email="newop@example.com").exists())

    def test_resend_activation_reissues_and_queues(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url(), self.PAYLOAD)
        user = User.objects.get(pk=created.data["id"])
        old_hash = user.password
        url = reverse("admin-user-resend-activation", args=[user.pk])
        with patch("users.api_views.send_activation_email_task.delay") as delay:
            with self.captureOnCommitCallbacks(execute=True):
                resp = self.client.post(url)
        self.assertEqual(resp.status_code, 200)
        user.refresh_from_db()
        self.assertNotEqual(user.password, old_hash)
        delay.assert_called_once()

    def test_resend_refused_for_activated(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-user-resend-activation", args=[self.operator.pk])
        self.assertEqual(self.client.post(url).status_code, 400)

    def test_reset_password_refused_for_pending(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(self.list_url(), self.PAYLOAD)
        url = reverse("admin-user-reset-password", args=[created.data["id"]])
        self.assertEqual(self.client.post(url).status_code, 400)

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

    def test_delete_not_allowed(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(self.detail_url(self.operator)).status_code, 405)
        self.assertTrue(User.objects.filter(pk=self.operator.pk).exists())

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
