"""Anonymous forgot-password API."""

from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import password_reset
from .tasks import send_password_reset_email_task

INVALID_LINK = "This reset link is invalid or has expired."


class _ResetView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []


class PasswordResetRequestView(_ResetView):
    """Email a reset link. Always answers the same so it can't reveal which emails exist."""

    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        if email:
            for user in password_reset.eligible_users(email):
                send_password_reset_email_task.delay(user.pk)
        return Response({"detail": "If that email belongs to an account, a reset link is on its way."})


class PasswordResetConfirmView(_ResetView):
    """Set a new password from the emailed link."""

    def post(self, request):
        try:
            password_reset.reset(
                str(request.data.get("uid", "")),
                str(request.data.get("token", "")),
                str(request.data.get("new_password", "")),
            )
        except password_reset.ResetLinkError:
            raise ValidationError({"detail": INVALID_LINK})
        except password_reset.ResetRejected as exc:
            raise ValidationError(exc.errors)
        return Response({"detail": "Password updated."})
