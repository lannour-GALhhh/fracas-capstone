"""Per-cycle scoring context.

Loads everything the factors need in a handful of queries (no N+1) and
computes cross-barangay aggregates once. Built once per compute cycle and
shared across all barangays.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.utils import timezone

from barangays.models import Barangay
from dam_level.models import Dam, DamReading
from monitoring.constants import SOURCE_DAM, SOURCE_RAINFALL, STALE_AFTER
from rainfall_fetch.models import Rainfall


@dataclass
class ScoringContext:
    barangays: list[Barangay]
    rainfall_by_barangay: dict[int, Rainfall]
    sorted_elevations: list[float]  # ascending; for percentile-rank vulnerability
    dam: Dam | None = None
    dam_reading: DamReading | None = None

    def rainfall_for(self, barangay: Barangay) -> Rainfall | None:
        return self.rainfall_by_barangay.get(barangay.id)

    @classmethod
    def build(cls) -> "ScoringContext":
        # defer the heavy boundary geometry — scoring only needs elevation.
        barangays = list(Barangay.objects.defer("boundary"))

        # Stale inputs are dropped (treated as missing) so the engine degrades
        # the score and redistributes weight, rather than trusting old readings
        # and emitting a false-low "all calm".
        now = timezone.now()
        rainfall_cutoff = now - STALE_AFTER[SOURCE_RAINFALL]
        dam_cutoff = now - STALE_AFTER[SOURCE_DAM]

        # Latest reading per barangay in a single query (Postgres DISTINCT ON).
        latest = (
            Rainfall.objects.order_by("barangay_id", "-recorded_at")
            .distinct("barangay_id")
        )
        rainfall_by_barangay = {
            r.barangay_id: r for r in latest if r.recorded_at >= rainfall_cutoff
        }

        sorted_elevations = sorted(
            b.land_height_mean for b in barangays if b.land_height_mean is not None
        )

        # Scoring needs only levels + influence radius, not the map geometry.
        dam = Dam.objects.defer("river", "location").first()
        dam_reading = dam.readings.first() if dam else None  # latest (Meta ordering)
        if dam_reading is not None and dam_reading.recorded_at < dam_cutoff:
            dam_reading = None

        return cls(
            barangays=barangays,
            rainfall_by_barangay=rainfall_by_barangay,
            sorted_elevations=sorted_elevations,
            dam=dam,
            dam_reading=dam_reading,
        )
