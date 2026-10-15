"""Notification-delivery tasks — async so slow gateways never block callers."""

import logging

from backend.inline import task

from .constants import Channel, DeliveryStatus
from .models import Device, NotificationLog, User
from .senders import InvalidTokenError, SendError, get_push_provider, get_sms_provider
from .services import activation, password_reset

logger = logging.getLogger(__name__)


def _finalize(user_id, channel, dedup_key, status, detail=""):
    NotificationLog.objects.filter(
        user_id=user_id, channel=channel, dedup_key=dedup_key
    ).update(status=status, detail=detail)


@task
def send_sms_task(user_id, dedup_key, to, message):
    try:
        get_sms_provider().send(to, message)
        _finalize(user_id, Channel.SMS, dedup_key, DeliveryStatus.SENT)
    except SendError as exc:
        logger.error("SMS send failed: %s", exc)
        _finalize(user_id, Channel.SMS, dedup_key, DeliveryStatus.FAILED, str(exc))


@task
def send_activation_email_task(user_id, token):
    user = User.objects.filter(pk=user_id, is_active=True, is_activated=False).first()
    if not (user and user.email):
        return
    activation.send_activation_email(user, token)


@task
def send_password_reset_email_task(user_id):
    user = User.objects.filter(pk=user_id, is_active=True, is_activated=True).first()
    if not (user and user.email):
        return
    password_reset.send_reset_email(user)


@task
def send_push_task(user_id, dedup_key, token, title, body, data=None):
    try:
        get_push_provider().send(token, title, body, data)
        _finalize(user_id, Channel.PUSH, dedup_key, DeliveryStatus.SENT)
    except InvalidTokenError as exc:
        # Dead token: stop targeting this device on future broadcasts.
        Device.objects.filter(token=token).update(is_active=False)
        logger.warning("Push token deactivated: %s", exc)
        _finalize(user_id, Channel.PUSH, dedup_key, DeliveryStatus.FAILED, str(exc))
    except SendError as exc:
        logger.error("Push send failed: %s", exc)
        _finalize(user_id, Channel.PUSH, dedup_key, DeliveryStatus.FAILED, str(exc))
