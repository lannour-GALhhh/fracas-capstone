"""Authenticated account API: phone verification, subscriptions, devices, prefs."""

import secrets

from django.db.models import Q
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from alert.senders import SendError

from .models import AccountChange, Device, NotificationPreference, Subscription, User
from .permissions import IsAdmin, IsOperator
from .serializers import (
    AccountChangeSerializer,
    AdminUserCreateSerializer,
    AdminUserSerializer,
    DeviceSerializer,
    NotificationPreferenceSerializer,
    OperatorSerializer,
    SubscriptionSerializer,
)
from .services import account_changes
from .services.otp import OTPError, generate_and_send, verify


class AccountChangeListView(ListAPIView):
    """The signed-in user's own account-change history, newest first."""

    serializer_class = AccountChangeSerializer

    def get_queryset(self):
        return AccountChange.objects.filter(user=self.request.user).select_related("actor")


class OperatorListView(ListAPIView):
    """Operators + admins as {id, name}, for the flood-report source picker.

    Unpaginated — the client filters this small list in-memory.
    """

    serializer_class = OperatorSerializer
    permission_classes = [IsOperator]
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(
            Q(is_operator=True) | Q(is_staff=True) | Q(is_superuser=True)
        ).order_by("first_name", "last_name", "username")


def _is_last_active_admin(user: User) -> bool:
    """True if `user` is the only remaining active staff/superuser account."""
    if not (user.is_staff or user.is_superuser):
        return False
    others = User.objects.filter(
        Q(is_staff=True) | Q(is_superuser=True), is_active=True
    ).exclude(pk=user.pk)
    return not others.exists()


class AdminUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
):
    """Admin console: list/create/edit every account (list/create/edit, no delete).

    Deactivating (`is_active=False`) is the removal path, not deletion. Three
    guardrails, enforced server-side:
    - the last active admin can't be demoted or deactivated;
    - an admin can't remove their own admin access or deactivate themselves;
    - `is_superuser` is never exposed by the serializer, so it's never
      settable here — that flag stays a Django `/admin/` break-glass path.
    """

    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by("-date_joined")
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        return AdminUserCreateSerializer if self.action == "create" else AdminUserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        role = params.get("role")
        if role == "admin":
            qs = qs.filter(Q(is_staff=True) | Q(is_superuser=True))
        elif role == "operator":
            qs = qs.filter(is_operator=True, is_staff=False, is_superuser=False)
        elif role == "resident":
            qs = qs.filter(is_operator=False, is_staff=False, is_superuser=False)

        is_active = params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("1", "true", "yes"))

        return qs

    def perform_update(self, serializer):
        instance = serializer.instance
        actor = self.request.user
        validated = serializer.validated_data

        demoting = validated.get("is_staff") is False
        deactivating = validated.get("is_active") is False

        if instance.pk == actor.pk and (demoting or deactivating):
            raise PermissionDenied(
                "You can't remove your own admin access or deactivate your own account."
            )
        if (demoting or deactivating) and _is_last_active_admin(instance):
            raise ValidationError(
                "This is the last active admin account — promote another admin first."
            )

        serializer.save()

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """Generate a new random password for this account and return it once.

        No email/SMS password-reset flow exists in this system yet, so the
        admin relays the generated password to the user out-of-band.
        """
        user = self.get_object()
        new_password = secrets.token_urlsafe(9)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        account_changes.log_password_change(user, request.user)
        return Response({"password": new_password})

    @action(detail=True, methods=["get"])
    def changes(self, request, pk=None):
        """This account's audit trail (profile edits + role/status changes)."""
        user = self.get_object()
        queryset = AccountChange.objects.filter(user=user).select_related("actor")
        page = self.paginate_queryset(queryset)
        serializer = AccountChangeSerializer(page if page is not None else queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class RequestPhoneOTPView(APIView):
    def post(self, request):
        try:
            generate_and_send(request.user)
        except (OTPError, SendError) as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"detail": "Verification code sent."})


class VerifyPhoneOTPView(APIView):
    def post(self, request):
        try:
            verify(request.user, str(request.data.get("code", "")))
        except OTPError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"detail": "Phone number verified."})


class SubscriptionViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.DestroyModelMixin, GenericViewSet
):
    serializer_class = SubscriptionSerializer

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user).select_related("barangay")

    def perform_create(self, serializer):
        # Idempotent: re-subscribing is a no-op rather than a 400.
        serializer.instance, _ = Subscription.objects.get_or_create(
            user=self.request.user, **serializer.validated_data
        )


class DeviceViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.DestroyModelMixin, GenericViewSet
):
    serializer_class = DeviceSerializer

    def get_queryset(self):
        return Device.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        data = serializer.validated_data
        serializer.instance, _ = Device.objects.update_or_create(
            token=data["token"],
            defaults={
                "user": self.request.user,
                "platform": data.get("platform", Device.Platform.ANDROID),
                "is_active": True,
            },
        )


class NotificationPreferenceView(RetrieveUpdateAPIView):
    serializer_class = NotificationPreferenceSerializer

    def get_object(self):
        prefs, _ = NotificationPreference.objects.get_or_create(user=self.request.user)
        return prefs
