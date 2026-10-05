"""Anonymous account-activation API (the emailed link's landing page)."""

from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import activation

INVALID_LINK = "This activation link is invalid or has expired."


class _ActivationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []


class ActivationVerifyView(_ActivationView):
    """Check a link before showing the set-password form."""

    def post(self, request):
        try:
            user = activation.resolve(str(request.data.get("token", "")))
        except activation.ActivationError:
            raise ValidationError({"detail": INVALID_LINK})
        # The generated username is only a suggestion to prefill; the owner picks their own.
        return Response({"suggested_username": user.username, "first_name": user.first_name})


class ActivationCompleteView(_ActivationView):
    """Set the owner's chosen username + password and activate the account."""

    def post(self, request):
        try:
            activation.activate(
                str(request.data.get("token", "")),
                str(request.data.get("username", "")),
                str(request.data.get("new_password", "")),
            )
        except activation.ActivationError:
            raise ValidationError({"detail": INVALID_LINK})
        except activation.ActivationRejected as exc:
            raise ValidationError(exc.errors)
        return Response({"detail": "Account activated."})
