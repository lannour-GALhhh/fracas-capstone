"""Point + radius evacuations: circle geometry, affected barangays, notify, stand-down."""

from __future__ import annotations

from uuid import uuid4

from django.contrib.gis.geos import Point
from django.db.models import Count
from django.utils import timezone

from audit.services import log_change
from barangays.models import Barangay

from ..models import RadiusEvacuation, RadiusEvacuationStatus

MIN_RADIUS_M = 50
MAX_RADIUS_M = 10_000
# Metric CRS for Zamboanga City (UTM zone 51N) — buffers in metres, not degrees.
METRIC_SRID = 32651


def build_circle(lat: float, lng: float, radius_m: int):
    """The centre point and its radius-metre circle polygon, both in WGS84."""
    center = Point(lng, lat, srid=4326)
    area = center.transform(METRIC_SRID, clone=True).buffer(radius_m, 32)
    area.transform(4326)
    return center, area


def affected_barangays(area) -> list[dict]:
    """Barangays whose boundary intersects the circle, as [{id, name}]."""
    return [
        {"id": b.id, "name": b.name}
        for b in Barangay.objects.filter(boundary__intersects=area).only("id", "name").order_by("name")
    ]


def _notify(barangays: list[dict], title: str, body: str, key: str) -> None:
    from users.services.notify import broadcast

    for b in Barangay.objects.filter(id__in=[x["id"] for x in barangays]):
        broadcast(b, title=title, body=body, dispatch_key=key)


def declare(*, lat: float, lng: float, radius_m: int, name: str = "", actor=None) -> RadiusEvacuation:
    center, area = build_circle(lat, lng, radius_m)
    barangays = affected_barangays(area)
    evac = RadiusEvacuation.objects.create(
        origin_barangay=Barangay.objects.filter(boundary__contains=center).first(),
        name=name, center=center, radius_m=radius_m, area=area,
        barangays=barangays, triggered_by=actor,
    )
    label = name or "your area"
    _notify(
        barangays,
        title=f"Evacuate now: {label}",
        body=(
            f"An evacuation has been declared within {radius_m:,} m of a marked point. "
            "If you are inside the radius shown in the app, proceed to the nearest evacuation center."
        ),
        key=f"radius-evac:{evac.id}:{uuid4().hex}",
    )
    log_change(
        actor, "evacuation", action="radius_declared", field="radius",
        new_value=f"#{evac.id} {radius_m} m @ {lat:.5f},{lng:.5f}: "
        + (", ".join(b["name"] for b in barangays) or "no barangay"),
    )
    return evac


def counts(evac_ids) -> dict[int, dict[str, int]]:
    """{evacuation_id: {inside, safe}} in one grouped query."""
    out: dict[int, dict[str, int]] = {i: {"inside": 0, "safe": 0} for i in evac_ids}
    rows = (
        RadiusEvacuationStatus.objects.filter(evacuation_id__in=evac_ids)
        .values("evacuation_id", "status")
        .annotate(n=Count("id"))
    )
    for r in rows:
        out[r["evacuation_id"]][r["status"]] = r["n"]
    return out


def stand_down(evac: RadiusEvacuation, *, actor=None) -> RadiusEvacuation:
    c = counts([evac.id])[evac.id]
    evac.final_inside, evac.final_safe = c["inside"], c["safe"]
    evac.status = RadiusEvacuation.Status.STOOD_DOWN
    evac.closed_at = timezone.now()
    evac.save()
    _notify(
        evac.barangays,
        title=f"Evacuation lifted: {evac.name or 'marked area'}",
        body="The radius evacuation has been stood down. Stay alert for further advisories.",
        key=f"radius-evac-lifted:{evac.id}:{uuid4().hex}",
    )
    log_change(
        actor, "evacuation", action="radius_stood_down",
        field="radius", new_value=f"#{evac.id}",
    )
    return evac
