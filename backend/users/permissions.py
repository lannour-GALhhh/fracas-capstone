"""Web-console role gates."""

from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


class IsOperator(BasePermission):
    """Allow DRRMO operators and admins; reject residents and anonymous users."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_operator or user.is_staff or user.is_superuser)
        )


class IsAdmin(BasePermission):
    """Allow system administrators only (Django admin-site users)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (user.is_staff or user.is_superuser)
        )


def assert_barangay_access(user, *barangay_ids) -> None:
    """Raise 403 unless `user` may act on every given barangay.

    Accounts without an assignment (and admins) are unrestricted. A None id
    (an action not resolvable to any barangay) is refused for scoped accounts.
    """
    scope = user.barangay_scope()
    if scope is None:
        return
    if not barangay_ids or any(b is None or int(b) not in scope for b in barangay_ids):
        raise PermissionDenied("You can only take actions in your assigned barangays.")
