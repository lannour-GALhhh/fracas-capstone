from djoser.serializers import SetPasswordSerializer
from rest_framework import serializers

from .models import AccountChange, Device, NotificationPreference, Subscription, User
from .services import account_changes


class OperatorSerializer(serializers.ModelSerializer):
    """Lean {id, name} shape for operator pickers (no PII beyond a display name)."""

    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name"]

    def get_name(self, user) -> str:
        return user.get_full_name() or user.get_username()


# Keys kept from a submitted address; anything else is dropped. `*_code` are the
# PSGC codes the client stores so the edit form can re-select the dropdowns.
ADDRESS_KEYS = [
    "unit",
    "province",
    "province_code",
    "city",
    "city_code",
    "barangay",
    "barangay_code",
    "country",
    "zip_code",
]


def normalize_address(raw) -> dict:
    """Coerce a submitted address into the known string keys, defaulting country."""
    raw = raw or {}
    address = {key: str(raw.get(key, "")).strip() for key in ADDRESS_KEYS}
    if not address["country"]:
        address["country"] = "Philippines"
    return address


class CurrentUserSerializer(serializers.ModelSerializer):
    """The signed-in user's own profile, for djoser's `/users/me/` (GET + PATCH).

    Operators self-edit their name, email, phone and home address; `username`,
    activation and the derived `role` stay read-only (identity/authorization are
    managed elsewhere, not self-service from the console). Every edit is diffed
    into an `AccountChange` audit row so the account page (and a future admin
    page) can show a history."""

    role = serializers.CharField(read_only=True)
    address = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "address",
            "is_active",
            "role",
        ]
        read_only_fields = ["id", "username", "is_active", "role"]

    def to_representation(self, instance):
        """Always return the full address shape so the client can rely on the keys."""
        data = super().to_representation(instance)
        data["address"] = normalize_address(instance.address)
        return data

    def update(self, instance, validated_data):
        before = account_changes.capture(instance)
        address = validated_data.pop("address", None)
        user = super().update(instance, validated_data)
        if address is not None:
            user.address = normalize_address(address)
            user.save(update_fields=["address"])
        actor = getattr(self.context.get("request"), "user", None)
        account_changes.record_update(user, before, actor)
        return user


class LoggingSetPasswordSerializer(SetPasswordSerializer):
    """djoser `set_password`, plus an `AccountChange` row once the change is valid."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self.context["request"].user
        account_changes.log_password_change(user, user)
        return attrs


class AccountChangeSerializer(serializers.ModelSerializer):
    """One row of the account-change history (read-only)."""

    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AccountChange
        fields = ["id", "action", "field", "old_value", "new_value", "changed_at", "actor_name"]
        read_only_fields = fields

    def get_actor_name(self, change) -> str | None:
        actor = change.actor
        if actor is None:
            return None
        return actor.get_full_name() or actor.get_username()


class SubscriptionSerializer(serializers.ModelSerializer):
    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = Subscription
        fields = ["id", "barangay", "barangay_name", "created_at"]
        read_only_fields = ["created_at"]


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ["id", "token", "platform", "is_active", "created_at"]
        read_only_fields = ["is_active", "created_at"]
        # perform_create upserts by token, so drop DRF's auto UniqueValidator.
        extra_kwargs = {"token": {"validators": []}}


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "sms_enabled",
            "push_enabled",
            "inapp_enabled",
            "quiet_hours_start",
            "quiet_hours_end",
        ]
