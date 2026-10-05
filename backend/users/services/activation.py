"""Console-account activation.

An admin creating an account gives it a temporary username + password and emails
the owner a link carrying a signed token of both. The account can't sign in
(`is_activated=False`, enforced by `ActivatedModelBackend`) until the owner opens
the link and picks their own username and password — the only place `is_activated` becomes True.
The token is single-use in effect: activating replaces the temporary password,
so it stops verifying.
"""

import re
import secrets
import string
import unicodedata

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError
from django.utils.html import escape

from ..models import User
from . import account_changes

SALT = "users.account-activation"
TEMP_PASSWORD_LENGTH = 8
MIN_USERNAME_LENGTH = 3


class ActivationError(Exception):
    """The link is invalid, expired, or already used (deliberately one vague case)."""


def generate_username(first_name: str, last_name: str) -> str:
    """`first_last`, ASCII-folded and lowercased; numbered if already taken."""
    raw = unicodedata.normalize("NFKD", f"{first_name} {last_name}")
    base = re.sub(r"[^a-z0-9]+", "_", raw.encode("ascii", "ignore").decode().lower()).strip("_")
    base = (base or "user")[:140]
    username, n = base, 1
    while User.objects.filter(username__iexact=username).exists():
        n += 1
        username = f"{base}{n}"
    return username


def generate_temp_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(TEMP_PASSWORD_LENGTH))


def make_token(username: str, temp_password: str) -> str:
    return signing.dumps({"u": username, "p": temp_password}, salt=SALT, compress=True)


def create_pending_user(**fields) -> tuple[User, str]:
    """Create an unactivated account with a generated username + temporary password.

    Returns the user and the activation-link token to email them.
    """
    username = generate_username(fields.get("first_name", ""), fields.get("last_name", ""))
    temp_password = generate_temp_password()
    user = User(username=username, is_activated=False, **fields)
    user.set_password(temp_password)
    user.save()
    return user, make_token(username, temp_password)


def resolve(token: str) -> User:
    """The pending user a valid token belongs to, else ActivationError."""
    try:
        data = signing.loads(token, salt=SALT, max_age=settings.ACTIVATION_LINK_TTL)
        username, temp_password = data["u"], data["p"]
    except (signing.BadSignature, KeyError, TypeError):
        raise ActivationError
    user = User.objects.filter(username=username, is_active=True, is_activated=False).first()
    if user is None or not user.check_password(temp_password):
        raise ActivationError
    return user


def activate(token: str, username: str, new_password: str) -> User:
    """Set the owner's chosen username + password and mark the account activated."""
    user = resolve(token)
    username = username.strip()
    errors = {}

    try:
        User._meta.get_field("username").run_validators(username)
        if len(username) < MIN_USERNAME_LENGTH:
            raise DjangoValidationError(f"Use at least {MIN_USERNAME_LENGTH} characters.")
        if User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
            raise DjangoValidationError("This username is already taken.")
    except DjangoValidationError as exc:
        errors["username"] = list(exc.messages)
    try:
        validate_password(new_password, user)
    except DjangoValidationError as exc:
        errors["new_password"] = list(exc.messages)
    if errors:
        raise ActivationRejected(errors)

    user.username = username
    user.set_password(new_password)
    user.is_activated = True
    try:
        user.save(update_fields=["username", "password", "is_activated"])
    except IntegrityError:  # lost a race for the username
        raise ActivationRejected({"username": ["This username is already taken."]})
    account_changes.log_password_change(user, user)
    return user


class ActivationRejected(Exception):
    """The chosen username/password was refused; `errors` maps field -> messages."""

    def __init__(self, errors):
        super().__init__(errors)
        self.errors = errors


def reissue(user: User) -> str:
    """Give a pending user a fresh temporary password; returns the new link token."""
    temp_password = generate_temp_password()
    user.set_password(temp_password)
    user.save(update_fields=["password"])
    return make_token(user.username, temp_password)


def send_activation_email(user: User, token: str) -> None:
    """Email the activation button. Raises on delivery failure."""
    link = f"{settings.FRONTEND_URL.rstrip('/')}/account-activation/{token}"
    name = user.first_name or "there"
    days = max(settings.ACTIVATION_LINK_TTL // 86400, 1)
    expiry = f"This link expires in {days} day{'s' if days != 1 else ''}."

    text = (
        f"Hi {name},\n\n"
        "An account was created for you on FRACAS, the flood-risk early-warning "
        "system for Zamboanga City.\n\n"
        f"Activate your account and choose your username and password:\n{link}\n\n"
        f"{expiry} If you weren't expecting this, you can ignore this email."
    )
    html = (
        f"<p>Hi {escape(name)},</p>"
        "<p>An account was created for you on <strong>FRACAS</strong>, the flood-risk "
        "early-warning system for Zamboanga City.</p>"
        f'<p><a href="{escape(link)}" style="display:inline-block;padding:12px 24px;'
        "background:#172554;color:#ffffff;text-decoration:none;border-radius:8px;"
        'font-weight:600">Activate account</a></p>'
        f'<p style="color:#666;font-size:12px">{expiry} If you weren\'t expecting this, '
        "you can ignore this email.</p>"
    )
    message = EmailMultiAlternatives("Activate your FRACAS account", text, to=[user.email])
    message.attach_alternative(html, "text/html")
    message.send()
