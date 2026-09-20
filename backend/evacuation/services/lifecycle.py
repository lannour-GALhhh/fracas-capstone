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


def send_evac_push(barangay) -> int:
    from users.services.notify import broadcast

    return broadcast(
        barangay,
        title=EVAC_PUSH_TITLE.format(name=barangay.name),
        body=EVAC_PUSH_BODY,
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
    """Close an active evacuation: freeze counts, mark stood-down, audit it.

    ``actor`` is the operator for a manual stand-down, ``None`` when the
    pipeline closes it automatically (recorded as a system action).
    """
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


def open_automated(barangay) -> Evacuation | None:
    """Open an automated evacuation for a barangay, firing the push once.

    Returns the row only when it was newly created (so callers can count opens);
    the unique active-per-barangay constraint makes this a no-op if one is open.
    """
    evac, created = Evacuation.objects.get_or_create(
        barangay=barangay,
        status=Evacuation.Status.ACTIVE,
        defaults={"trigger": Evacuation.Trigger.AUTOMATED},
    )
    if not created:
        return None
    send_evac_push(barangay)
    log_change(
        None, "evacuation", action="auto_opened",
        field="barangay", new_value=f"{barangay.name} (#{barangay.id})",
    )
    return evac


def reconcile() -> dict:
    """Open/close automated evacuations to match the barangays currently critical."""
    from barangays.models import Barangay
    from risk_score.constants import RiskCategory
    from risk_score.models import RiskScore

    latest = (
        RiskScore.objects.order_by("barangay_id", "-computed_at")
        .distinct("barangay_id")
        .values_list("barangay_id", "category")
    )
    band_ids = {barangay_id for barangay_id, category in latest if category == RiskCategory.CRITICAL}

    active = list(
        Evacuation.objects.filter(status=Evacuation.Status.ACTIVE).select_related("barangay")
    )
    active_barangay_ids = {e.barangay_id for e in active}

    # Open: critical, not already open.
    opened = 0
    to_open = band_ids - active_barangay_ids
    if to_open:
        for barangay in Barangay.objects.filter(pk__in=to_open):
            if open_automated(barangay) is not None:
                opened += 1

    # Close: automated evacuations whose hazard has cleared.
    closed = 0
    for evac in active:
        if evac.trigger == Evacuation.Trigger.AUTOMATED and evac.barangay_id not in band_ids:
            stand_down(evac)
            closed += 1

    if opened or closed:
        snapshot.refresh()
    return {"opened": opened, "closed": closed}
