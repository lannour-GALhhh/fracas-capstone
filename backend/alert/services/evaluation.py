"""Alert state machine with hysteresis.

Runs each cycle over the latest risk score per barangay:
  - not critical -> critical      => notify (entered)
  - critical -> critical          => re-notify only after RENOTIFY_INTERVAL
  - critical -> not critical      => notify (all-clear)
Only CRITICAL triggers resident alerts; the AlertState row is the memory that
keeps us from re-notifying every 15 minutes.
"""

from datetime import timedelta

from django.utils import timezone

from alert.models import AlertState
from risk_score.constants import RiskCategory
from risk_score.models import RiskScore

from .dispatcher import dispatch

ALERT_LEVEL = RiskCategory.CRITICAL
RENOTIFY_INTERVAL = timedelta(hours=1)


def _latest_scores():
    return (
        RiskScore.objects.order_by("barangay_id", "-computed_at")
        .distinct("barangay_id")
        .select_related("barangay")
    )


def evaluate() -> dict:
    notified = 0
    for score in _latest_scores():
        state, _ = AlertState.objects.get_or_create(barangay=score.barangay)
        if _process(state, score):
            notified += 1
    return {"notified": notified}


def _process(state: AlertState, score: RiskScore) -> bool:
    now = timezone.now()
    was_critical = state.level == ALERT_LEVEL
    is_critical = score.category == ALERT_LEVEL

    notify = all_clear = False
    if is_critical and not was_critical:
        notify = True
    elif is_critical and was_critical:
        notify = state.last_notified_at is None or (now - state.last_notified_at) >= RENOTIFY_INTERVAL
    elif was_critical and not is_critical:
        notify = all_clear = True

    if score.category != state.level:
        state.level = score.category
        state.entered_at = now

    # Operator suppression mutes automated dispatch but still tracks the level,
    # so an all-clear/re-alert resumes correctly once un-suppressed.
    if state.is_suppressed:
        notify = all_clear = False

    if notify:
        key = f"{score.barangay_id}:{score.computed_at.isoformat()}"
        dispatch(score.barangay, score.category, score.score, key, all_clear=all_clear)
        state.last_notified_at = now

    state.save()
    return notify
