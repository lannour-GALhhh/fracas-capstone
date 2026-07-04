"""Audit trail for account edits: diff a profile save into AccountChange rows.

Mirrors ``flood_events/services/changes.py``. Scalar fields are diffed
old → new; a password change is logged as a single valueless row.
"""

import json

from ..models import AccountChange

# Profile fields worth an audit trail. `address` is a JSON blob compared as a
# whole and shown as a one-line address.
TRACKED_FIELDS = [
    "first_name",
    "last_name",
    "email",
    "phone_number",
    "address",
]

# Order used to render an address dict into a readable one-liner.
_ADDRESS_PARTS = ["unit", "barangay", "city", "province", "zip_code", "country"]


def _display(value) -> str:
    return "" if value is None else str(value)


def format_address(address: dict) -> str:
    """Human-readable one-line address, skipping blank parts."""
    address = address or {}
    parts = [str(address.get(p, "")).strip() for p in _ADDRESS_PARTS]
    return ", ".join(p for p in parts if p)


def _field_kv(user, field) -> tuple:
    """(comparison key, display string) for one field of a user."""
    if field == "address":
        address = user.address or {}
        # Stable key so re-ordered/equal dicts don't register as a change.
        return (json.dumps(address, sort_keys=True), format_address(address))
    value = getattr(user, field)
    return (value, _display(value))


def capture(user) -> dict:
    """Snapshot the tracked fields before an update, for later diffing."""
    return {field: _field_kv(user, field) for field in TRACKED_FIELDS}


def record_update(user, before: dict, actor) -> list:
    """Write an UPDATED row for every tracked field that changed."""
    rows = []
    for field in TRACKED_FIELDS:
        old_key, old_disp = before[field]
        new_key, new_disp = _field_kv(user, field)
        if old_key != new_key:
            rows.append(
                AccountChange(
                    user=user,
                    actor=actor,
                    action=AccountChange.Action.UPDATED,
                    field=field,
                    old_value=old_disp,
                    new_value=new_disp,
                )
            )
    if rows:
        AccountChange.objects.bulk_create(rows)
    return rows


def log_password_change(user, actor) -> AccountChange:
    """Record that the account password was changed (no values stored)."""
    return AccountChange.objects.create(
        user=user, actor=actor, action=AccountChange.Action.PASSWORD_CHANGED
    )
