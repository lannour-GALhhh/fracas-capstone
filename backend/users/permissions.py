"""Web-console role gates."""

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
