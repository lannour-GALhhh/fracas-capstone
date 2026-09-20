"""Channel sender contracts.

Senders are dumb: they push one message to one destination and raise SendError
on failure. Recipient resolution, dedup, and prefs live in the dispatcher.
"""

from typing import Protocol


class SendError(Exception):
    """Raised when a provider fails to deliver."""


class SmsProvider(Protocol):
    def send(self, to: str, message: str) -> None: ...


class PushProvider(Protocol):
    def send(self, token: str, title: str, body: str) -> None: ...
