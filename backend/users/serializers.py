from django.contrib.auth.password_validation import validate_password
from djoser.serializers import SetPasswordSerializer
from rest_framework import serializers

from .models import AccountChange, Device, Notification, NotificationPreference, Subscription, User
from .services import account_changes, activation


class OperatorSerializer(serializers.ModelSerializer):
    """Lean {id, name} shape for operator pickers (no PII beyond a display name)."""

    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name"]

    def get_name(self, user) -> str:
        return user.get_full_name() or user.get_username()


class AdminUserSerializer(serializers.ModelSerializer):
    """Full user record for the admin console: profile + role/status flags."""

    role = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "phone_verified",
            "is_active",
            "status",
            "is_operator",
            "is_staff",
            "role",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "username",
            "phone_verified",
            "role",
            "status",
            "date_joined",
            "last_login",
        ]

    def update(self, instance, validated_data):
        before = account_changes.capture(instance)
        user = super().update(instance, validated_data)
        actor = getattr(self.context.get("request"), "user", None)
        account_changes.record_update(user, before, actor)
        return user


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Provision a console account pending activation.

    The username and a temporary password are generated here; the owner finishes
    setup from the emailed link (see `services.activation`). The role defaults to
    operator when neither role flag is sent.
    """

    role = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
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
            "is_operator",
            "is_staff",
            "role",
            "status",
        ]
        read_only_fields = ["id", "username"]
        extra_kwargs = {
            "email": {"required": True, "allow_blank": False},
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": True, "allow_blank": False},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        # Judge the raw input: form-encoded requests fill absent booleans in as False.
        if "is_operator" not in self.initial_data and "is_staff" not in self.initial_data:
            attrs["is_operator"] = True
        if not (attrs.get("is_operator") or attrs.get("is_staff")):
            raise serializers.ValidationError(
                "Pick a console role — this endpoint provisions operators and admins only."
            )
        return attrs

    def create(self, validated_data):
        validated_data["address"] = normalize_address(validated_data.get("address"))
        user, self.activation_token = activation.create_pending_user(**validated_data)
        return user


# Keys kept from a submitted address; anything else is dropped.
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
    """The signed-in user's own profile, for djoser's `/users/me/` (GET + PATCH)."""

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


class NotificationSerializer(serializers.ModelSerializer):
    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "barangay", "barangay_name", "category", "title", "body", "is_read", "created_at"]
        read_only_fields = fields
