"""Forgot-password by SMS code (mobile residents).

Two steps before the existing token-based confirm: ``request_code`` texts a one-time code
through the task queue; ``verify_code`` swaps a correct code for the same single-use
``(uid, token)`` pair the emailed link uses, so ``password_reset.reset`` finishes the job.
The dev ``OTP_BYPASS_CODE`` is deliberately NOT honoured here — it would let anyone take
over any account.
"""

from django.core.cache import cache

from users.models import User

from . import password_reset
from .otp import OTPError, generate_and_send
from .registration import normalize_phone

MAX_ATTEMPTS = 5
ATTEMPT_WINDOW = 15 * 60  # seconds


class PhoneResetError(Exception):
    """The code is wrong, expired, or too many guesses were made."""


def eligible_user(phone: str) -> User | None:
    return User.objects.filter(phone_number=phone, is_active=True, is_activated=True).first()


def request_code(raw_phone: str) -> None:
    """Queue a reset code. Silent for unknown numbers/cooldowns so it can't be used to probe accounts."""
    from .registration import RegistrationError

    try:
        phone = normalize_phone(raw_phone)
    except RegistrationError:
        return
    user = eligible_user(phone)
    if user is None:
        return
    try:
        generate_and_send(user, purpose="password reset", queued=True)
    except OTPError:
        pass  # resend cooldown: the earlier code is still valid


def _attempts_key(phone: str) -> str:
    return f"phone-reset-attempts:{phone}"


def verify_code(raw_phone: str, code: str) -> tuple[str, str]:
    """Check the code; on success consume it and return ``(uid, token)`` for the confirm step."""
    from .registration import RegistrationError

    generic = PhoneResetError("Invalid or expired code.")
    try:
        phone = normalize_phone(raw_phone)
    except RegistrationError:
        raise generic
    key = _attempts_key(phone)
    attempts = cache.get(key, 0)
    if attempts >= MAX_ATTEMPTS:
        raise PhoneResetError("Too many attempts. Request a new code.")

    user = eligible_user(phone)
    otp = user.phone_otps.filter(verified=False).order_by("-created_at").first() if user else None
    if otp is None or not otp.is_valid(code):
        cache.set(key, attempts + 1, ATTEMPT_WINDOW)
        raise generic

    otp.verified = True
    otp.save(update_fields=["verified"])
    cache.delete(key)
    return password_reset.make_link_params(user)
