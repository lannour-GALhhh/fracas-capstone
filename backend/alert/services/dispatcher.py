"""Fan an alert out to a barangay's subscribers across enabled channels.

Idempotent: each (user, channel, dispatch_key) is logged once via
NotificationLog's unique constraint, so retries/re-runs never double-send.
In-app records are written synchronously; SMS/push are enqueued as async tasks
so slow gateways never block the scoring pipeline.
"""

from django.utils import timezone

from alert.constants import Channel, DeliveryStatus
from alert.models import Notification, NotificationLog
from users.models import NotificationPreference, Subscription

from . import messages


def _preferences(user) -> NotificationPreference:
    try:
        return user.notification_preference
    except NotificationPreference.DoesNotExist:
        return NotificationPreference(user=user)  # unsaved defaults (all enabled)


def _in_quiet_hours(prefs: NotificationPreference) -> bool:
    start, end = prefs.quiet_hours_start, prefs.quiet_hours_end
    if not start or not end:
        return False
    now = timezone.localtime().time()
    if start <= end:
        return start <= now <= end
    return now >= start or now <= end  # window wraps midnight


def _claim(user, barangay, channel, dedup_key) -> NotificationLog | None:
    """Reserve a send; returns the log if newly claimed, else None (already sent)."""
    log, created = NotificationLog.objects.get_or_create(
        user=user,
        channel=channel,
        dedup_key=dedup_key,
        defaults={"barangay": barangay, "status": DeliveryStatus.PENDING},
    )
    return log if created else None


def _fan_out(
    barangay, category: str, title: str, body: str, dispatch_key: str,
    *, respect_quiet_hours: bool = True,
) -> int:
    """Send one message to every subscriber across their enabled channels.

    Returns the number of subscribers reached. Idempotent per dispatch_key.
    """
    from alert.tasks import send_push_task, send_sms_task  # avoid import cycle

    recipients = 0
    for sub in Subscription.objects.filter(barangay=barangay).select_related("user"):
        recipients += 1
        user = sub.user
        prefs = _preferences(user)
        quiet = respect_quiet_hours and _in_quiet_hours(prefs)

        if prefs.inapp_enabled and _claim(user, barangay, Channel.INAPP, dispatch_key):
            Notification.objects.create(
                user=user, barangay=barangay, category=category, title=title, body=body
            )
            NotificationLog.objects.filter(
                user=user, channel=Channel.INAPP, dedup_key=dispatch_key
            ).update(status=DeliveryStatus.SENT)

        if prefs.sms_enabled and user.phone_verified and user.phone_number and not quiet:
            if _claim(user, barangay, Channel.SMS, dispatch_key):
                send_sms_task.delay(user.id, dispatch_key, user.phone_number, body)

        if prefs.push_enabled and not quiet:
            for device in user.devices.filter(is_active=True):
                key = f"{dispatch_key}:{device.id}"
                if _claim(user, barangay, Channel.PUSH, key):
                    send_push_task.delay(user.id, key, device.token, title, body)
    return recipients


def dispatch(barangay, category: str, score: float, dispatch_key: str, *, all_clear: bool = False):
    if all_clear:
        title, body = messages.all_clear_message(barangay.name, category)
    else:
        title, body = messages.critical_message(barangay.name, score)
    return _fan_out(barangay, category, title, body, dispatch_key)


def broadcast(barangay, title: str, body: str, dispatch_key: str, *, category: str = "critical") -> int:
    """Operator-initiated custom alert to a barangay's subscribers.

    Ignores quiet hours — an operator broadcast is a deliberate, typically
    urgent override — but still honors each user's per-channel opt-in.
    """
    return _fan_out(barangay, category, title, body, dispatch_key, respect_quiet_hours=False)
