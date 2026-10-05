"""Django email backend that delivers through Brevo's transactional email API.

Select it with `EMAIL_BACKEND=backend.email_backend.BrevoEmailBackend` and set
`BREVO_API_KEY`. Plain HTTP (no SDK), matching the SMS providers. Anything that
calls `send_mail` / `EmailMessage` — including djoser — goes through it.
"""

import logging
from email.utils import parseaddr

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"
TIMEOUT = 15


def _contact(address: str) -> dict:
    name, email = parseaddr(address)
    return {"email": email, **({"name": name} if name else {})}


class BrevoError(Exception):
    """Brevo rejected a send. `permanent` errors (4xx except 429) won't succeed on retry."""

    def __init__(self, message, permanent):
        super().__init__(message)
        self.permanent = permanent


class BrevoEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, "BREVO_API_KEY", "")

    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            try:
                self._send(message)
                sent += 1
            except Exception:
                logger.exception("Brevo send failed (to=%s)", message.to)
                if not self.fail_silently:
                    raise
        return sent

    def _send(self, message) -> None:
        if not self.api_key:
            raise ValueError("BREVO_API_KEY is not configured.")
        payload = {
            "sender": _contact(message.from_email or settings.DEFAULT_FROM_EMAIL),
            "to": [_contact(addr) for addr in message.to],
            "subject": message.subject,
            "textContent": message.body,
        }
        html = next((c for c, mime in message.alternatives if mime == "text/html"), None)
        if html:
            payload["htmlContent"] = html
        if message.cc:
            payload["cc"] = [_contact(addr) for addr in message.cc]
        if message.reply_to:
            payload["replyTo"] = _contact(message.reply_to[0])

        resp = requests.post(
            BREVO_SEND_URL,
            json=payload,
            headers={"api-key": self.api_key, "accept": "application/json"},
            timeout=TIMEOUT,
        )
        if not resp.ok:
            raise BrevoError(
                f"Brevo {resp.status_code}: {resp.text[:300]}",
                permanent=400 <= resp.status_code < 500 and resp.status_code != 429,
            )
