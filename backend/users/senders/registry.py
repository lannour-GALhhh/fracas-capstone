"""Provider selection by env var — swap SMS/push backends without code changes.

    SMS_PROVIDER=console|twilio|semaphore   (default: console)
    PUSH_PROVIDER=console|fcm               (default: console)
"""

from decouple import config

from .base import PushProvider, SendError, SmsProvider
from .push import ConsolePushProvider, FcmProvider
from .sms import ConsoleSmsProvider, SemaphoreSmsProvider, TwilioSmsProvider

_SMS_PROVIDERS = {
    "console": ConsoleSmsProvider,
    "twilio": TwilioSmsProvider,
    "semaphore": SemaphoreSmsProvider,
}
_PUSH_PROVIDERS = {
    "console": ConsolePushProvider,
    "fcm": FcmProvider,
}


def get_sms_provider(name: str | None = None) -> SmsProvider:
    name = (name or config("SMS_PROVIDER", default="console")).lower()
    try:
        return _SMS_PROVIDERS[name]()
    except KeyError:
        raise SendError(f"Unknown SMS provider: {name!r}")


def get_push_provider(name: str | None = None) -> PushProvider:
    name = (name or config("PUSH_PROVIDER", default="console")).lower()
    try:
        return _PUSH_PROVIDERS[name]()
    except KeyError:
        raise SendError(f"Unknown push provider: {name!r}")
