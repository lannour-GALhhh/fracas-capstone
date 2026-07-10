"""Phone-number verification via one-time SMS codes.

Sent synchronously (the user is waiting for the code) using the configured
SMS provider. A short resend cooldown limits abuse.
"""

import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from alert.senders import get_sms_provider
from users.models import PhoneOTP

OTP_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)


class OTPError(Exception):
    """Recoverable OTP problem surfaced to the client."""


def generate_and_send(user) -> None:
    if not user.phone_number:
        raise OTPError("No phone number on this account.")
    if user.phone_otps.filter(created_at__gte=timezone.now() - RESEND_COOLDOWN).exists():
        raise OTPError("Please wait a moment before requesting another code.")

    from users.models import RegistrationPolicy

    code = f"{secrets.randbelow(1_000_000):06d}"
    ttl = RegistrationPolicy.cached().otp_ttl
    PhoneOTP.objects.create(user=user, code=code, expires_at=timezone.now() + ttl)
    get_sms_provider().send(user.phone_number, f"Your FRACAS verification code is {code}")


def verify(user, code: str) -> None:
    bypass = getattr(settings, "OTP_BYPASS_CODE", "")
    if bypass and code == bypass:
        # Dev/presentation shortcut: accept the configured code without a real OTP.
        _mark_phone_verified(user)
        return

    otp = user.phone_otps.filter(verified=False).order_by("-created_at").first()
    if otp is None or not otp.is_valid(code):
        raise OTPError("Invalid or expired code.")
    otp.verified = True
    otp.save(update_fields=["verified"])
    _mark_phone_verified(user)


def _mark_phone_verified(user) -> None:
    user.phone_verified = True
    user.save(update_fields=["phone_verified"])
