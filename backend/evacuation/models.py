from django.conf import settings
from django.contrib.gis.db import models


class EvacuationCenter(models.Model):
    """A designated evacuation center. Shipped to the mobile app as GeoJSON so it
    can compute the nearest center to the resident client-side (no per-user geo
    work on the backend)."""

    name = models.CharField(max_length=255)
    location = models.PointField(srid=4326)
    # Which barangay it sits in (nullable — a center may be unmapped or just outside
    # a loaded boundary). Kept loose on purpose; the app resolves "nearest" by distance.
    barangay = models.ForeignKey(
        "barangays.Barangay",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evacuation_centers",
    )
    capacity = models.PositiveIntegerField(null=True, blank=True)
    contact = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Evacuation(models.Model):
    """One evacuation activation for a barangay — opens when the area turns
    critical or an operator pings it, closes at stand-down. Mirrors the
    ``AlertState`` (current) vs ``AlertEvent`` (log) split: this is the current
    record *and* the permanent history — at stand-down we freeze the final
    aggregate counts onto it, so a past evacuation is answerable from this row
    alone without keeping the per-user ``EvacuationStatus`` rows around."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        STOOD_DOWN = "stood_down", "Stood down"

    class Trigger(models.TextChoices):
        AUTOMATED = "automated", "Automated"   # crossed the trigger band
        OPERATOR = "operator", "Operator"      # manual ping / broadcast

    barangay = models.ForeignKey(
        "barangays.Barangay", on_delete=models.CASCADE, related_name="evacuations"
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    trigger = models.CharField(max_length=12, choices=Trigger.choices)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="Operator who pinged; null when automated.",
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    # Frozen at stand-down — the permanent historical record. ``final_roster`` is
    # the subscriber count (the denominator) at close.
    final_roster = models.PositiveIntegerField(null=True, blank=True)
    final_safe = models.PositiveIntegerField(null=True, blank=True)
    final_moving = models.PositiveIntegerField(null=True, blank=True)
    final_unaccounted = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            # At most one open evacuation per barangay at a time.
            models.UniqueConstraint(
                fields=["barangay"],
                condition=models.Q(status="active"),
                name="uniq_active_evacuation_per_barangay",
            )
        ]
        indexes = [models.Index(fields=["status", "-opened_at"])]
        ordering = ["-opened_at"]

    def __str__(self):
        return f"Evacuation<{self.barangay_id} {self.status}>"


class EvacuationStatus(models.Model):
    """One resident's status within an active evacuation. A row exists *only for
    subscribers whose app has reported* — never one per subscriber — so the write
    target stays tiny. ``unaccounted`` is derived on read (roster minus reporters),
    not stored, so we never fan out a row per resident."""

    class Status(models.TextChoices):
        NOTIFIED = "notified", "Notified"
        MOVING = "moving", "Moving"
        SAFE = "safe", "Safe"
        UNACCOUNTED = "unaccounted", "Unaccounted"

    class ResolvedVia(models.TextChoices):
        CENTER = "center", "Reached center"
        LEFT_ZONE = "left_zone", "Left danger zone"

    evacuation = models.ForeignKey(
        Evacuation, on_delete=models.CASCADE, related_name="statuses"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+"
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.NOTIFIED
    )
    resolved_via = models.CharField(
        max_length=12, choices=ResolvedVia.choices, blank=True
    )
    center = models.ForeignKey(
        EvacuationCenter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="Set when resolved_via=center.",
    )
    # Reduced-precision, latest reported coordinate — operator audit only.
    last_lat = models.FloatField(null=True, blank=True)
    last_lng = models.FloatField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["evacuation", "user"], name="uniq_evacuation_user"
            )
        ]
        # Queries are always scoped to a specific (active) evacuation id, so this
        # composite index gives hot-set performance without a partial index that
        # would have to reference the parent's status column.
        indexes = [models.Index(fields=["evacuation", "status"])]

    def __str__(self):
        return f"EvacuationStatus<{self.evacuation_id} u{self.user_id} {self.status}>"
