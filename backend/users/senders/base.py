"""Channel sender contracts."""

from typing import Protocol


class SendError(Exception):
    """Raised when a provider fails to deliver."""


class InvalidTokenError(SendError):
    """The push token is permanently dead (app uninstalled / token rotated)."""


class SmsProvider(Protocol):
    def send(self, to: str, message: str) -> None: ...


class PushProvider(Protocol):
    def send(self, token: str, title: str, body: str, data: dict | None = None) -> None: ...
