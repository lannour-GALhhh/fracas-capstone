"""Helpers for writing ConfigChangeLog rows and diffing singleton edits."""

from .models import ConfigChangeLog


def log_change(actor, target, *, action="", field="", old_value="", new_value=""):
    """Record one config/ops change. `actor` may be None (system-initiated)."""
    return ConfigChangeLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        target=target,
        action=action,
        field=field,
        old_value="" if old_value is None else str(old_value),
        new_value="" if new_value is None else str(new_value),
    )


def log_field_diffs(actor, target, before: dict, after: dict):
    """Write one ConfigChangeLog row per field whose value actually changed."""
    rows = []
    for field, new in after.items():
        old = before.get(field)
        if old != new:
            rows.append(
                log_change(
                    actor, target, action="updated", field=field,
                    old_value=old, new_value=new,
                )
            )
    return rows
