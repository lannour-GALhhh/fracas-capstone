from rest_framework import serializers

from .models import RadiusEvacuationStatus
from .services.radius import MAX_RADIUS_M, MIN_RADIUS_M


class DeclareRadiusSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)
    radius_m = serializers.IntegerField(min_value=MIN_RADIUS_M, max_value=MAX_RADIUS_M)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)


class RadiusReportSerializer(serializers.Serializer):
    evacuation_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=RadiusEvacuationStatus.Status.choices)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)


def evac_geography(evac) -> dict:
    """The recorded geography — shared by every representation."""
    return {
        "id": evac.id,
        "name": evac.name,
        "center": {"lat": evac.center.y, "lng": evac.center.x},
        "radius_m": evac.radius_m,
        "barangays": evac.barangays,
        "origin_barangay": (
            {"id": evac.origin_barangay_id, "name": evac.origin_barangay.name}
            if evac.origin_barangay_id
            else None
        ),
        "opened_at": evac.opened_at,
    }


def point_history(params) -> list:
    """Stood-down point evacuations matching the history filters (same params as barangay ones)."""
    from django.utils.dateparse import parse_date, parse_datetime

    from .models import RadiusEvacuation

    if params.get("trigger") == "automated":  # point evacuations are always operator-declared
        return []
    qs = RadiusEvacuation.objects.filter(
        status=RadiusEvacuation.Status.STOOD_DOWN
    ).select_related("origin_barangay", "triggered_by")
    ids = [b for b in (params.get("barangay") or "").split(",") if b.strip().isdigit()]
    if ids:
        qs = qs.filter(origin_barangay_id__in=ids)

    def day(raw):
        if not raw:
            return None
        dt = parse_datetime(raw)
        return dt.date() if dt else parse_date(raw)

    if after := day(params.get("closed_after")):
        qs = qs.filter(closed_at__date__gte=after)
    if before := day(params.get("closed_before")):
        qs = qs.filter(closed_at__date__lte=before)
    return list(qs)


class PointHistorySerializer(serializers.Serializer):
    """A closed point evacuation, shaped like a barangay history row."""

    def to_representation(self, e):
        user = e.triggered_by
        inside, safe = e.final_inside, e.final_safe
        recorded = inside is not None and safe is not None
        return {
            "id": e.id,
            "type": "point",
            # Filed under the barangay the origin point falls in.
            "barangay": (
                {"id": e.origin_barangay_id, "name": e.origin_barangay.name}
                if e.origin_barangay_id
                else {"id": None, "name": "Unmapped area"}
            ),
            "trigger": "operator",
            "zones": [],
            "triggered_by_name": (
                (user.get_full_name() or user.get_username() or str(user.pk)) if user else None
            ),
            "opened_at": e.opened_at,
            "closed_at": e.closed_at,
            "duration_seconds": int((e.closed_at - e.opened_at).total_seconds()),
            # Everyone who was ever inside is the roster; "safe" = left the radius.
            "final_roster": inside + safe if recorded else None,
            "final_safe": safe,
            "final_moving": 0 if recorded else None,
            "final_unaccounted": inside if recorded else None,
            "center": {"lat": e.center.y, "lng": e.center.x},
            "radius_m": e.radius_m,
            "affected_barangays": e.barangays,
        }
