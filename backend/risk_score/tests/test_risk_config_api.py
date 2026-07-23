from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from risk_score.models import RiskConfig


def make_admin(username="boss"):
    return get_user_model().objects.create_user(username, password="pw", is_staff=True)


def make_config(name="baseline", is_active=False):
    return RiskConfig.objects.create(
        name=name,
        is_active=is_active,
        weights={"rainfall": 0.5, "susceptibility": 0.5},
        thresholds={"medium": 25.0, "high": 50.0, "critical": 75.0},
    )


class RiskConfigPermissionTests(APITestCase):
    def test_non_admin_forbidden(self):
        user = get_user_model().objects.create_user("resident", password="pw")
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(reverse("risk-config-list")).status_code, 403)

    def test_operator_forbidden(self):
        user = get_user_model().objects.create_user("op", password="pw", is_operator=True)
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(reverse("risk-config-list")).status_code, 403)


class RiskConfigCrudTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_authenticate(self.admin)

    def test_list_configs(self):
        before = RiskConfig.objects.count()
        make_config("a")
        make_config("b")
        resp = self.client.get(reverse("risk-config-list"))
        self.assertEqual(resp.status_code, 200)
        rows = resp.data["results"] if "results" in resp.data else resp.data
        self.assertEqual(len(rows), before + 2)

    def test_create_valid_config(self):
        resp = self.client.post(
            reverse("risk-config-list"),
            {
                "name": "new",
                "weights": {"rainfall": 0.6, "susceptibility": 0.4},
                "thresholds": {"medium": 20, "high": 45, "critical": 70},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertFalse(resp.data["is_active"])

    def test_create_cannot_set_is_active_directly(self):
        resp = self.client.post(
            reverse("risk-config-list"),
            {
                "name": "sneaky",
                "is_active": True,
                "weights": {"rainfall": 0.5, "susceptibility": 0.5},
                "thresholds": {"medium": 25, "high": 50, "critical": 75},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertFalse(RiskConfig.objects.get(name="sneaky").is_active)

    def test_weights_must_sum_to_one(self):
        # Weights are only enforced in the legacy additive mode.
        resp = self.client.post(
            reverse("risk-config-list"),
            {
                "name": "bad",
                "combination_mode": "weighted_sum",
                "weights": {"rainfall": 0.9, "susceptibility": 0.4},
                "thresholds": {"medium": 25, "high": 50, "critical": 75},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("weights", resp.data)

    def test_invalid_rainfall_curve_rejected(self):
        resp = self.client.post(
            reverse("risk-config-list"),
            {
                "name": "bad-curve",
                "rainfall_curve": [[0, 0], [5, 1.5]],  # y out of 0-1
                "thresholds": {"medium": 25, "high": 50, "critical": 75},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("rainfall_curve", resp.data)

    def test_thresholds_must_be_ordered(self):
        resp = self.client.post(
            reverse("risk-config-list"),
            {
                "name": "bad-thresholds",
                "weights": {"rainfall": 0.5, "susceptibility": 0.5},
                "thresholds": {"medium": 60, "high": 50, "critical": 75},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("thresholds", resp.data)

    def test_partial_update_revalidates_merged_config(self):
        config = RiskConfig.objects.create(
            name="editable",
            combination_mode="weighted_sum",
            weights={"rainfall": 0.5, "susceptibility": 0.5},
            thresholds={"medium": 25.0, "high": 50.0, "critical": 75.0},
        )
        resp = self.client.patch(
            reverse("risk-config-detail", args=[config.pk]),
            {"weights": {"rainfall": 0.9, "susceptibility": 0.4}},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("weights", resp.data)

    def test_destroy_not_allowed(self):
        config = make_config("keep-me")
        resp = self.client.delete(reverse("risk-config-detail", args=[config.pk]))
        self.assertEqual(resp.status_code, 405)


class RiskConfigActivateTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_authenticate(self.admin)

    def test_activate_deactivates_others(self):
        old = make_config("old", is_active=True)
        new = make_config("new", is_active=False)

        resp = self.client.post(reverse("risk-config-activate", args=[new.pk]))
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["is_active"])

        old.refresh_from_db()
        new.refresh_from_db()
        self.assertFalse(old.is_active)
        self.assertTrue(new.is_active)
