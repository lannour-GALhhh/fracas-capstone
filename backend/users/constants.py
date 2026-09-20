from django.db import models


class Channel(models.TextChoices):
    SMS = "sms", "SMS"
    PUSH = "push", "Push"
    INAPP = "inapp", "In-app"


class DeliveryStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SENT = "sent", "Sent"
    FAILED = "failed", "Failed"
    SKIPPED = "skipped", "Skipped"
