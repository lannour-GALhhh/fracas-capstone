"""Authenticated account API: phone verification, subscriptions, devices, prefs."""

from django.db.models import Q
from rest_framework import mixins
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from alert.senders import SendError

from .models import AccountChange, Device, NotificationPreference, Subscription, User
from .permissions import IsOperator
from .serializers import (
    AccountChangeSerializer,
    DeviceSerializer,
    NotificationPreferenceSerializer,
    OperatorSerializer,
    SubscriptionSerializer,
)
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
