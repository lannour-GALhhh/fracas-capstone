"""Audit trail for flood events: diff a save into per-field FloodEventChange rows."""

from ..models import FloodEventChange

# Scalar fields worth an audit trail. FK fields are compared by id but shown by name.
TRACKED_FIELDS = [
    "barangay",
    "occurred_at",
    "ended_at",
    "severity",
    "water_depth_m",
    "summary",
    "people_affected",
    "people_evacuated",
    "source_type",
    "reported_by",
    "source",
    "notes",
]


def _display(value) -> str:
    return "" if value is None else str(value)


def _field_kv(event, field) -> tuple:
    """(comparison key, display string) for one field of an event."""
    if field == "barangay":
        return (event.barangay_id, str(event.barangay) if event.barangay_id else "")
    if field == "reported_by":
        name = str(event.reported_by) if event.reported_by_id else ""
        return (event.reported_by_id, name)
    value = getattr(event, field)
    return (value, _display(value))


def capture(event) -> dict:
    """Snapshot the tracked fields before an update, for later diffing."""
    return {field: _field_kv(event, field) for field in TRACKED_FIELDS}


def record_update(event, before: dict, editor) -> list:
    """Write an UPDATED row for every tracked field that changed."""
    rows = []
    for field in TRACKED_FIELDS:
        old_key, old_disp = before[field]
        new_key, new_disp = _field_kv(event, field)
        if old_key != new_key:
            rows.append(
                FloodEventChange(
                    flood_event=event,
                    editor=editor,
                    action=FloodEventChange.Action.UPDATED,
                    field=field,
                    old_value=old_disp,
                    new_value=new_disp,
                )
            )
    if rows:
        FloodEventChange.objects.bulk_create(rows)
    return rows


def log_action(event, action, editor, *, field="", old_value="", new_value="") -> FloodEventChange:
    """Record a whole-event lifecycle step (created/confirmed/resolved/…)."""
    return FloodEventChange.objects.create(
        flood_event=event,
        editor=editor,
        action=action,
        field=field,
        old_value=old_value,
        new_value=new_value,
    )
