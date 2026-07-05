"""Phone-first resident registration (mobile app), in three phases.

1. ``start``        — phone number + home address → create an INACTIVE account
                      (``username = normalized phone``) and send an OTP.
2. ``verify``       — OTP code → mark the phone verified + stamp terms acceptance.
3. ``set_password`` — set a (lenient) password and activate the account.

The account is kept ``is_active=False`` with an unusable password until phase 3,
so a half-finished registration can neither log in nor receive alerts. Phone is
the login identity: ``username`` is stored as the normalized phone so the existing
username-based JWT login works unchanged for residents.
"""

import re

from django.utils import timezone

from users.models import User
from users.serializers import normalize_address

from .otp import OTPError, generate_and_send, verify


class RegistrationError(Exception):
    """Recoverable registration problem surfaced to the client."""


def normalize_phone(raw: str) -> str:
    """Coerce a PH mobile number into E.164 ``+639XXXXXXXXX`` or raise.

    Accepts ``09171234567``, ``9171234567``, ``639171234567``, ``+639171234567``
    with optional spaces/dashes.
    """
    digits = re.sub(r"[\s\-()]", "", raw or "")
    if digits.startswith("+63"):
        digits = digits[3:]
    elif digits.startswith("63"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = digits[1:]
    if not re.fullmatch(r"9\d{9}", digits):
        raise RegistrationError("Enter a valid Philippine mobile number.")
    return f"+63{digits}"


def start(raw_phone: str, address: dict) -> User:
    """Phase 1: create/reuse an inactive account for ``raw_phone`` and send an OTP."""
    phone = normalize_phone(raw_phone)

    user = User.objects.filter(phone_number=phone).first()
    if user and user.is_active:
        raise RegistrationError("An account with this phone number already exists.")

    if user is None:
        user = User(username=phone, phone_number=phone)
        user.set_unusable_password()
    user.is_active = False
    user.address = normalize_address(address)
    user.save()

    # Reuse the OTP service (code gen, TTL, resend cooldown, SMS send).
    generate_and_send(user)
    return user


def resend(raw_phone: str) -> None:
    """Re-send the OTP for a pending (inactive) registration."""
    user = _pending_user(normalize_phone(raw_phone))
    generate_and_send(user)


def verify_code(raw_phone: str, code: str) -> User:
    """Phase 2: verify the OTP and record privacy/terms acceptance."""
    user = _pending_user(normalize_phone(raw_phone))
    verify(user, code)  # sets phone_verified; raises OTPError on bad/expired code
    user.terms_accepted_at = timezone.now()
    user.save(update_fields=["terms_accepted_at"])
    return user


def set_password(raw_phone: str, password: str) -> User:
    """Phase 3: set the password and activate the account.

    Guarded so it only completes a verified, not-yet-activated registration.
    Django's configured (lenient) validators run in the serializer before this.
    """
    user = _pending_user(normalize_phone(raw_phone))
    if not user.phone_verified:
        raise RegistrationError("Verify your phone number before setting a password.")
    user.set_password(password)
    user.is_active = True
    user.save(update_fields=["password", "is_active"])
    return user


def _pending_user(phone: str) -> User:
    """Fetch an in-progress (inactive) registration or raise."""
    user = User.objects.filter(phone_number=phone).first()
    if user is None:
        raise RegistrationError("No pending registration for this phone number.")
    if user.is_active:
        raise RegistrationError("An account with this phone number already exists.")
    return user


__all__ = ["RegistrationError", "OTPError", "normalize_phone", "start", "resend", "verify_code", "set_password"]
