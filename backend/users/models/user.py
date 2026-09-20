from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Project user tied to JWT auth."""

    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    phone_verified = models.BooleanField(default=False)

    # Null for accounts created outside phone-first mobile registration.
    terms_accepted_at = models.DateTimeField(null=True, blank=True)

    # Self-contained address blob (PSGC), deliberately not linked to Barangay.
    address = models.JSONField(default=dict, blank=True)

    is_operator = models.BooleanField(
        default=False,
        help_text=(
            "DRRMO operator: can run the web console (GIS, history, broadcasts, "
            "monitoring) but is deliberately kept OUT of the Django admin site. "
            "Admin-site access is Django's `is_staff`; operators are non-staff."
        ),
    )

    @property
    def role(self) -> str:
        """Web-console role, derived from Django's auth flags."""
        if self.is_staff or self.is_superuser:
            return "admin"
        if self.is_operator:
            return "operator"
        return "resident"

    def __str__(self):
        return self.get_username()
