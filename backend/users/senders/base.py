"""Channel sender contracts."""

from typing import Protocol


class SendError(Exception):
    """Raised when a provider fails to deliver."""


class SmsProvider(Protocol):
    def send(self, to: str, message: str) -> None: ...


class PushProvider(Protocol):
    def send(self, token: str, title: str, body: str) -> None: ...
