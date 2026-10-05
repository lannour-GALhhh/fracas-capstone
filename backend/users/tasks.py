"""Notification-delivery Celery tasks — async so slow gateways never block callers."""

import logging

from celery import shared_task

from backend.email_backend import BrevoError

from .constants import Channel, DeliveryStatus
from .models import NotificationLog, User
from .senders import SendError, get_push_provider, get_sms_provider
from .services import activation, password_reset

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


@shared_task(bind=True, max_retries=3)
def send_activation_email_task(self, user_id, token):
    user = User.objects.filter(pk=user_id, is_active=True, is_activated=False).first()
    if not (user and user.email):
        return
    try:
        activation.send_activation_email(user, token)
    except BrevoError as exc:
        if exc.permanent:  # bad key / blocked IP / unverified sender: retrying can't help
            raise
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)
    except Exception as exc:  # network blips and the like
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)


@shared_task(bind=True, max_retries=3)
def send_password_reset_email_task(self, user_id):
    user = User.objects.filter(pk=user_id, is_active=True, is_activated=True).first()
    if not (user and user.email):
        return
    try:
        password_reset.send_reset_email(user)
    except BrevoError as exc:
        if exc.permanent:
            raise
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)


@shared_task
def send_push_task(user_id, dedup_key, token, title, body):
    try:
        get_push_provider().send(token, title, body)
        _finalize(user_id, Channel.PUSH, dedup_key, DeliveryStatus.SENT)
    except SendError as exc:
        logger.error("Push send failed: %s", exc)
        _finalize(user_id, Channel.PUSH, dedup_key, DeliveryStatus.FAILED, str(exc))
