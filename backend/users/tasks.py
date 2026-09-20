"""Notification-delivery Celery tasks — async so slow gateways never block callers."""

import logging

from celery import shared_task

from .constants import Channel, DeliveryStatus
from .models import NotificationLog
from .senders import SendError, get_push_provider, get_sms_provider

logger = logging.getLogger(__name__)


def _finalize(user_id, channel, dedup_key, status, detail=""):
    NotificationLog.objects.filter(
        user_id=user_id, channel=channel, dedup_key=dedup_key
    ).update(status=status, detail=detail)


@shared_task
def send_sms_task(user_id, dedup_key, to, message):
    try:
        get_sms_provider().send(to, message)
        _finalize(user_id, Channel.SMS, dedup_key, DeliveryStatus.SENT)
    except SendError as exc:
        logger.error("SMS send failed: %s", exc)
        _finalize(user_id, Channel.SMS, dedup_key, DeliveryStatus.FAILED, str(exc))


@shared_task
def send_push_task(user_id, dedup_key, token, title, body):
    try:
        get_push_provider().send(token, title, body)
        _finalize(user_id, Channel.PUSH, dedup_key, DeliveryStatus.SENT)
    except SendError as exc:
        logger.error("Push send failed: %s", exc)
        _finalize(user_id, Channel.PUSH, dedup_key, DeliveryStatus.FAILED, str(exc))
