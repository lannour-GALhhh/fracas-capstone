"""Anonymous, phone-first resident registration API (mobile app).

Three phases (see ``services/registration.py``): start → verify → set-password.
All ``AllowAny`` and anon-throttled; abuse is bounded by the OTP resend cooldown
and by refusing phone numbers that already have an active account.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from alert.senders import SendError

from .registration_serializers import (
    RegisterResendSerializer,
    RegisterSetPasswordSerializer,
    RegisterStartSerializer,
    RegisterVerifySerializer,
)
from .serializers_jwt import RoleTokenObtainPairSerializer
from .services import registration
from .services.otp import OTPError


class _AnonView(APIView):
    permission_classes = [AllowAny]


class RegisterStartView(_AnonView):
    def post(self, request):
        serializer = RegisterStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            registration.start(
                serializer.validated_data["phone_number"],
                serializer.validated_data.get("address") or {},
            )
        except (registration.RegistrationError, OTPError, SendError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Verification code sent."})


class RegisterResendView(_AnonView):
    def post(self, request):
        serializer = RegisterResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            registration.resend(serializer.validated_data["phone_number"])
        except (registration.RegistrationError, OTPError, SendError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Verification code sent."})


class RegisterVerifyView(_AnonView):
    def post(self, request):
        serializer = RegisterVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            registration.verify_code(
                serializer.validated_data["phone_number"],
                serializer.validated_data["code"],
            )
        except (registration.RegistrationError, OTPError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Phone number verified."})


class RegisterSetPasswordView(_AnonView):
    def post(self, request):
        serializer = RegisterSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = registration.set_password(
                serializer.validated_data["phone_number"],
                serializer.validated_data["password"],
            )
        except registration.RegistrationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Land the app logged in: return access + refresh in the body (the mobile
        # client stores the refresh token in expo-secure-store).
        refresh = RoleTokenObtainPairSerializer.get_token(user)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_201_CREATED,
        )
