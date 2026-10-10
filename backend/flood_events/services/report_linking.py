"""Locate and link resident flood reports: point -> barangay, report -> open event."""

from datetime import timedelta

from django.contrib.gis.geos import Point

from barangays.models import Barangay

from ..models import FloodEvent

# A report taken shortly before an event was logged still belongs to it.
LINK_LEAD = timedelta(hours=6)


def barangay_at(latitude: float, longitude: float) -> Barangay | None:
    return Barangay.objects.filter(boundary__contains=Point(longitude, latitude, srid=4326)).first()


def find_event(barangay_id: int, captured_at) -> FloodEvent | None:
    """The live event in this barangay whose window covers ``captured_at``, if any."""
    candidates = FloodEvent.objects.filter(
        barangay_id=barangay_id,
        deleted_at__isnull=True,
        archived_at__isnull=True,
        occurred_at__lte=captured_at + LINK_LEAD,
    ).order_by("-occurred_at")
    for event in candidates:
        if event.ended_at is None or event.ended_at >= captured_at:
            return event
    return None
