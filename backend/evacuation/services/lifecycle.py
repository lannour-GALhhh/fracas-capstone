"""Automated evacuation lifecycle — open/close driven by the current risk score."""

from __future__ import annotations

from uuid import uuid4

from django.utils import timezone

from audit.services import log_change

from ..models import Evacuation
from . import snapshot

EVAC_PUSH_TITLE = "Evacuate now: {name}"
EVAC_PUSH_BODY = (
    "An evacuation has been declared for your barangay. "
    "Proceed to the nearest evacuation center."
)
EVAC_LIFTED_TITLE = "Evacuation lifted: {name}"
EVAC_LIFTED_BODY = (
    "The evacuation for your barangay has been stood down. "
    "It is safe to return home. Stay alert for further advisories."
)


def send_evac_push(barangay, zones: list[dict] | None = None) -> int:
    from users.services.notify import broadcast

    body = EVAC_PUSH_BODY
    if zones:
        names = ", ".join(z["level"].replace("_", " ") for z in zones)
        body = (
            f"An evacuation has been declared for the {names} flood-susceptibility "
            "zone(s) of your barangay. If you are in one, proceed to the nearest "
            "evacuation center."
        )
    return broadcast(
        barangay,
        title=EVAC_PUSH_TITLE.format(name=barangay.name),
        body=body,
        dispatch_key=f"evac:{barangay.id}:{uuid4().hex}",
    )


def send_evac_lifted(barangay) -> int:
    from users.services.notify import broadcast

    return broadcast(
        barangay,
        title=EVAC_LIFTED_TITLE.format(name=barangay.name),
        body=EVAC_LIFTED_BODY,
        dispatch_key=f"evac-lifted:{barangay.id}:{uuid4().hex}",
    )


def freeze_final_counts(evac: Evacuation) -> None:
    """Snapshot the live aggregate onto the row — the permanent record."""
    entry = next(
        (e for e in snapshot.compute() if e["evacuation_id"] == evac.id), None
    )
    if entry is not None:
        evac.final_roster = entry["roster"]
        evac.final_safe = entry["safe"]
        evac.final_moving = entry["moving"]
        evac.final_unaccounted = entry["unaccounted"]


def stand_down(evac: Evacuation, *, actor=None) -> Evacuation:
    """Close an active evacuation: freeze counts, mark stood-down, audit it."""
    freeze_final_counts(evac)
    evac.status = Evacuation.Status.STOOD_DOWN
    evac.closed_at = timezone.now()
    evac.save()
    send_evac_lifted(evac.barangay)  # close the loop for residents on every channel
    log_change(
        actor, "evacuation", action="stood_down",
        field="barangay", new_value=f"{evac.barangay.name} (#{evac.barangay_id})",
    )
    return evac
