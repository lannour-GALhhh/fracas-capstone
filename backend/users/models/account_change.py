from django.conf import settings
from django.db import models


class AccountChange(models.Model):
    """Append-only audit trail of changes to a user's own account.

    Profile edits are diffed field-by-field (old → new); a password change is a
    single valueless row. `actor` is who made the change — the user themselves
    for self-service now, a staff member once the admin page can edit accounts.
    """

    class Action(models.TextChoices):
        UPDATED = "updated", "Updated"
        PASSWORD_CHANGED = "password_changed", "Password changed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="account_changes"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+",
    )
    action = models.CharField(max_length=20, choices=Action.choices, default=Action.UPDATED)
    field = models.CharField(max_length=50, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-changed_at"]
        indexes = [models.Index(fields=["user", "-changed_at"])]

    def __str__(self):
        return f"{self.action} {self.field} on {self.user_id}"
