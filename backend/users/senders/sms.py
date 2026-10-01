"""SMS providers. Select one with the SMS_PROVIDER env var (see registry)."""

import logging

import requests
from decouple import config

from .base import SendError

logger = logging.getLogger(__name__)

TIMEOUT = 15


class ConsoleSmsProvider:
    """Dev default — logs instead of sending (preserves free-tier quota)."""

    def send(self, to: str, message: str) -> None:
        logger.info("[SMS:console] to=%s | %s", to, message)


class TwilioSmsProvider:
    """Twilio REST API over plain HTTP (no SDK dependency)."""

    def __init__(self):
        self.sid = config("TWILIO_ACCOUNT_SID")
        self.token = config("TWILIO_AUTH_TOKEN")
        self.sender = config("TWILIO_FROM")

    def send(self, to: str, message: str) -> None:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.sid}/Messages.json"
        try:
            resp = requests.post(
                url,
                data={"To": to, "From": self.sender, "Body": message},
                auth=(self.sid, self.token),
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise SendError(f"Twilio send failed: {exc}") from exc


class SemaphoreSmsProvider:
    """Semaphore (PH gateway with a free dev tier)."""

    def __init__(self):
        self.apikey = config("SEMAPHORE_API_KEY")
        self.sender = config("SEMAPHORE_SENDER_NAME", default="")

    def send(self, to: str, message: str) -> None:
        data = {"apikey": self.apikey, "number": to, "message": message}
        if self.sender:
            data["sendername"] = self.sender
        try:
            resp = requests.post(
                "https://api.semaphore.co/api/v4/messages", data=data, timeout=TIMEOUT
            )
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise SendError(f"Semaphore send failed: {exc}") from exc


class SmsApiPhProvider:
    """smsapiph.onrender.com — free, unverified dev/alpha-testing provider only.

    No SLA, no published owner/ToS, and a Render free-tier backend that
    cold-starts after idle. Confirmed 2026-09-24: its API always returns
    {"success": true} with no message ID or delivery status, and a real
    phone did not receive the test text — this only proves the request
    was accepted, not that a resident would receive anything. Use for
    exercising the send code path only; swap SMS_PROVIDER to
    twilio/semaphore before trusting it for actual delivery.
    """

    URL = "https://smsapiph.onrender.com/api/v1/send/sms"

    def __init__(self):
        self.apikey = config("SMSAPIPH_API_KEY")

    def send(self, to: str, message: str) -> None:
        try:
            resp = requests.post(
                self.URL,
                json={"recipient": to, "message": message},
                headers={"x-api-key": self.apikey},
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise SendError(f"smsapiph send failed: {exc}") from exc
