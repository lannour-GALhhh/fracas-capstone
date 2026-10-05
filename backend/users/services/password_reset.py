"""Forgot-password: emailed single-use reset link.

Uses Django's `PasswordResetTokenGenerator`, whose token is derived from the current
password hash, so it stops verifying the moment the password changes (single use) and
expires after `PASSWORD_RESET_TIMEOUT`. Only active, activated accounts are eligible.
"""

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from ..models import User
from . import account_changes


class ResetLinkError(Exception):
    """The link is invalid, expired, or already used (deliberately one vague case)."""


class ResetRejected(Exception):
    """The new password was refused; `errors` maps field -> messages."""

    def __init__(self, errors):
        super().__init__(errors)
        self.errors = errors


def eligible_users(email: str):
    return User.objects.filter(email__iexact=email.strip(), is_active=True, is_activated=True)


def make_link_params(user: User) -> tuple[str, str]:
    return urlsafe_base64_encode(str(user.pk).encode()), default_token_generator.make_token(user)


def resolve(uid: str, token: str) -> User:
    try:
        user = User.objects.get(pk=urlsafe_base64_decode(uid).decode(), is_active=True, is_activated=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError, UnicodeDecodeError):
        raise ResetLinkError
    if not default_token_generator.check_token(user, token):
        raise ResetLinkError
    return user


def reset(uid: str, token: str, new_password: str) -> User:
    user = resolve(uid, token)
    try:
        validate_password(new_password, user)
    except DjangoValidationError as exc:
        raise ResetRejected({"new_password": list(exc.messages)})
    user.set_password(new_password)
    user.save(update_fields=["password"])
    account_changes.log_password_change(user, user)
    return user


def send_reset_email(user: User) -> None:
    """Email the reset button. Raises on delivery failure."""
    uid, token = make_link_params(user)
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{uid}/{token}"
    name = user.first_name or user.username
    hours = max(settings.PASSWORD_RESET_TIMEOUT // 3600, 1)
    expiry = f"This link expires in {hours} hour{'s' if hours != 1 else ''} and works once."

    text = (
        f"Hi {name},\n\n"
        "We received a request to reset your FRACAS password.\n\n"
        f"Choose a new password:\n{link}\n\n"
        f"{expiry} If you didn't ask for this, you can ignore this email."
    )
    html = (
        f"<p>Hi {escape(name)},</p>"
        "<p>We received a request to reset your <strong>FRACAS</strong> password.</p>"
        f'<p><a href="{escape(link)}" style="display:inline-block;padding:12px 24px;'
        "background:#172554;color:#ffffff;text-decoration:none;border-radius:8px;"
        'font-weight:600">Reset password</a></p>'
        f'<p style="color:#666;font-size:12px">{expiry} If you didn\'t ask for this, '
        "you can ignore this email.</p>"
    )
    message = EmailMultiAlternatives("Reset your FRACAS password", text, to=[user.email])
    message.attach_alternative(html, "text/html")
    message.send()
