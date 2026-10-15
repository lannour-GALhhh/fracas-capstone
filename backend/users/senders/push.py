"""Push providers. Select one with the PUSH_PROVIDER env var (see registry)."""

import logging

from .base import InvalidTokenError, SendError

logger = logging.getLogger(__name__)


class ConsolePushProvider:
    """Dev default — logs instead of sending."""

    def send(self, token: str, title: str, body: str, data: dict | None = None) -> None:
        logger.info("[PUSH:console] token=%s | %s: %s | %s", token[:12], title, body, data or {})


class FcmProvider:
    """Firebase Cloud Messaging (React Native). Needs firebase-admin + credentials."""

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

    def send(self, token: str, title: str, body: str, data: dict | None = None) -> None:  # pragma: no cover - needs FCM
        from firebase_admin import exceptions, messaging

        message = messaging.Message(
            token=token,
            notification=messaging.Notification(title=title, body=body),
            # FCM data values must be strings.
            data={k: str(v) for k, v in (data or {}).items()},
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(channel_id="alerts"),
            ),
            apns=messaging.APNSConfig(
                headers={"apns-priority": "10"},
                payload=messaging.APNSPayload(aps=messaging.Aps(sound="default")),
            ),
        )
        try:
            messaging.send(message)
        except (messaging.UnregisteredError, messaging.SenderIdMismatchError) as exc:
            raise InvalidTokenError(f"FCM token is no longer valid: {exc}") from exc
        except exceptions.FirebaseError as exc:
            raise SendError(f"FCM send failed: {exc}") from exc
