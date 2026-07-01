"""Per-cycle scoring context.

Loads everything the factors need in a handful of queries (no N+1) and
computes cross-barangay aggregates once. Built once per compute cycle and
shared across all barangays.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.db.models import Max, Min

from barangays.models import Barangay
from dam_level.models import Dam, DamReading
from rainfall_fetch.models import Rainfall


@dataclass
class ScoringContext:
    barangays: list[Barangay]
    rainfall_by_barangay: dict[int, Rainfall]
    elevation_bounds: tuple[float, float] | None
    dam: Dam | None = None
    dam_reading: DamReading | None = None

    def rainfall_for(self, barangay: Barangay) -> Rainfall | None:
        return self.rainfall_by_barangay.get(barangay.id)

    @classmethod
    def build(cls) -> "ScoringContext":
        # defer the heavy boundary geometry — scoring only needs elevation.
        barangays = list(Barangay.objects.defer("boundary"))

        # Latest reading per barangay in a single query (Postgres DISTINCT ON).
        latest = (
            Rainfall.objects.order_by("barangay_id", "-recorded_at")
            .distinct("barangay_id")
        )
        rainfall_by_barangay = {r.barangay_id: r for r in latest}

        agg = Barangay.objects.aggregate(low=Min("land_height_mean"), high=Max("land_height_mean"))
        bounds = (agg["low"], agg["high"]) if agg["low"] is not None and agg["high"] is not None else None

        dam = Dam.objects.first()
        dam_reading = dam.readings.first() if dam else None  # latest (Meta ordering)

        return cls(
            barangays=barangays,
            rainfall_by_barangay=rainfall_by_barangay,
            elevation_bounds=bounds,
            dam=dam,
            dam_reading=dam_reading,
        )
