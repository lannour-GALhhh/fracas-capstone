"""Push providers. Select one with the PUSH_PROVIDER env var (see registry)."""

import logging

from .base import SendError

logger = logging.getLogger(__name__)


class ConsolePushProvider:
    """Dev default — logs instead of sending."""

    def send(self, token: str, title: str, body: str) -> None:
        logger.info("[PUSH:console] token=%s | %s: %s", token[:12], title, body)


class FcmProvider:
    """Firebase Cloud Messaging (React Native). Needs firebase-admin + credentials.

    firebase-admin is imported lazily so it is only required when PUSH_PROVIDER=fcm.
    """

    def __init__(self):
        try:
            import firebase_admin
            from firebase_admin import credentials
        except ImportError as exc:  # pragma: no cover - depends on optional package
            raise SendError("firebase-admin is not installed; `pip install firebase-admin`") from exc

        from decouple import config

        if not firebase_admin._apps:
            cred = credentials.Certificate(config("FCM_CREDENTIALS_FILE"))
            firebase_admin.initialize_app(cred)

    def send(self, token: str, title: str, body: str) -> None:  # pragma: no cover - needs FCM
        from firebase_admin import messaging

        try:
            messaging.send(
                messaging.Message(
                    notification=messaging.Notification(title=title, body=body), token=token
                )
            )
        except Exception as exc:  # firebase raises many types
            raise SendError(f"FCM send failed: {exc}") from exc
