from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Project user tied to JWT auth.

    Extends AbstractUser with the fields the alerting subsystem needs.
    Subscriptions, devices, and preferences are separate related models.
    """

    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    phone_verified = models.BooleanField(default=False)

    # Personal home address as a self-contained blob (unit, PSGC barangay/city/
    # province + codes, country, zip). Deliberately NOT linked to the operational
    # `Barangay` table — this is the user's residence, sourced from the PSGC API.
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
        """Web-console role, derived from Django's auth flags (single source of
        truth). `is_staff` is the admin-site gate, so admins are staff; operators
        are intentionally non-staff to stay out of `/admin/`."""
        if self.is_staff or self.is_superuser:
            return "admin"
        if self.is_operator:
            return "operator"
        return "resident"

    def __str__(self):
        return self.get_username()
