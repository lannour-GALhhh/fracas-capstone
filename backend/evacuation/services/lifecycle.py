"""Automated evacuation lifecycle — open/close driven by the alert state.

Runs as the pipeline step after ``evaluate_alerts`` (see
``risk_score.tasks.run_scoring_pipeline``). It is **state-based, not
edge-triggered**: every cycle it reconciles the desired set of active automated
evacuations against reality, so a missed edge, a restart, or a manually deleted
row self-heals on the next 15-minute cycle.

Rules:
  * a barangay in the alert trigger band, not operator-suppressed, with no open
    evacuation  -> open an ``AUTOMATED`` evacuation + fire the evac push;
  * an ``AUTOMATED`` evacuation whose barangay has dropped out of the band
    -> stand it down (freeze the final counts).

Operator-triggered evacuations are never auto-closed — a human declared them, a
human stands them down. Suppression only prevents *opening*; it never retracts
an evacuation already in progress.

Kept in the evacuation app (which may depend on ``alert``) so ``alert`` stays
free of any evacuation import — the codebase's one-way dependency rule.
"""

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
    """Fan the evacuation notice out to a barangay's subscribers (once per open).

    Reuses the alert dispatcher, so it lands on every channel the resident has
    enabled — in-app, push, and SMS — through the env-selected providers, and
    ignores quiet hours (an evacuation is a deliberate, urgent override).
    """
    from alert.services.dispatcher import broadcast

    return broadcast(
        barangay,
        title=EVAC_PUSH_TITLE.format(name=barangay.name),
        body=EVAC_PUSH_BODY,
        dispatch_key=f"evac:{barangay.id}:{uuid4().hex}",
    )


def send_evac_lifted(barangay) -> int:
    """Tell a barangay's subscribers the evacuation is over (once per stand-down).

    Same multi-channel fan-out as the open notice — a resident who got the
    'evacuate now' alert should get the 'safe to return' one on the same
    channels. A fresh dispatch key guarantees delivery even for a barangay that
    has been evacuated before.
    """
    from alert.services.dispatcher import broadcast

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
    """Open/close automated evacuations to match the current alert band."""
    from alert.models import AlertingPolicy, AlertState
    from barangays.models import Barangay

    policy = AlertingPolicy.cached()
    states = list(AlertState.objects.only("barangay_id", "level", "is_suppressed"))
    band_ids = {s.barangay_id for s in states if policy.triggers(s.level)}
    suppressed_ids = {s.barangay_id for s in states if s.is_suppressed}

    active = list(
        Evacuation.objects.filter(status=Evacuation.Status.ACTIVE).select_related("barangay")
    )
    active_barangay_ids = {e.barangay_id for e in active}

    # Open: in the band, not already open, not suppressed.
    opened = 0
    to_open = band_ids - active_barangay_ids - suppressed_ids
    if to_open:
        for barangay in Barangay.objects.filter(pk__in=to_open):
            if open_automated(barangay) is not None:
                opened += 1

    # Close: automated evacuations whose hazard has cleared (suppression never
    # forces a close — only the barangay leaving the band does).
    closed = 0
    for evac in active:
        if evac.trigger == Evacuation.Trigger.AUTOMATED and evac.barangay_id not in band_ids:
            stand_down(evac)
            closed += 1

    if opened or closed:
        snapshot.refresh()
    return {"opened": opened, "closed": closed}
