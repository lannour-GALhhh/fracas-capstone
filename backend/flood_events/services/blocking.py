"""Report-submission bans: look up, impose and lift a resident's block."""

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from ..models import ReporterBlock


def active_block(user):
    """The user's currently effective block, or ``None``."""
    if user is None:
        return None
    return (
        ReporterBlock.objects.filter(user=user, lifted_at__isnull=True)
        .filter(Q(blocked_until__isnull=True) | Q(blocked_until__gt=timezone.now()))
        .first()
    )


def block(user, *, days, reason, by, report=None):
    """Replace any active block with a new one (``days=None`` → permanent)."""
    lift(user)
    until = None if days is None else timezone.now() + timedelta(days=days)
    return ReporterBlock.objects.create(
        user=user, blocked_until=until, reason=reason, blocked_by=by, report=report
    )


def lift(user):
    """End every active block; returns how many were lifted."""
    return ReporterBlock.objects.filter(user=user, lifted_at__isnull=True).update(
        lifted_at=timezone.now()
    )


def active_blocks():
    """Every currently effective block, newest first (one per blocked user)."""
    return (
        ReporterBlock.objects.filter(lifted_at__isnull=True)
        .filter(Q(blocked_until__isnull=True) | Q(blocked_until__gt=timezone.now()))
        .select_related("report", "user")
        .prefetch_related("report__images")
    )
