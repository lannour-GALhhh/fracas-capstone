"""Admin-editable registration & account policy (cached singleton)."""

from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models

from audit.models import SingletonModel

# Today's OTP lifetime (mirrors users.services.otp.OTP_TTL).
DEFAULT_OTP_TTL_MINUTES = 10


class RegistrationPolicy(SingletonModel):
    self_registration_enabled = models.BooleanField(
        default=True, help_text="Allow the public app to start new resident registrations."
    )
    otp_ttl_minutes = models.PositiveIntegerField(
        default=DEFAULT_OTP_TTL_MINUTES, help_text="How long a phone verification code stays valid."
    )
    terms_version = models.CharField(
        max_length=20, default="1",
        help_text="Bumping this can force residents to re-accept the terms.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.otp_ttl_minutes < 1:
            raise ValidationError({"otp_ttl_minutes": "Must be at least 1 minute."})

    @property
    def otp_ttl(self) -> timedelta:
        return timedelta(minutes=self.otp_ttl_minutes)

    def __str__(self):
        return "Registration policy"
