"""Fan a message out to a barangay's subscribers across enabled channels."""

from django.utils import timezone

from ..constants import Channel, DeliveryStatus
from ..models import Notification, NotificationLog, NotificationPreference, Subscription


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
    log, created = NotificationLog.objects.get_or_create(
        user=user,
        channel=channel,
        dedup_key=dedup_key,
        defaults={"barangay": barangay, "status": DeliveryStatus.PENDING},
    )
    return log if created else None


def broadcast(
    barangay, title: str, body: str, dispatch_key: str,
    *, category: str = "critical", respect_quiet_hours: bool = False,
) -> int:
    from ..tasks import send_push_task, send_sms_task  # avoid import cycle

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
